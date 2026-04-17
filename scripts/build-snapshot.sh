#!/usr/bin/env bash
# One-shot automation of the Hetzner gold-image build.
#
# Reads config from .env.local:
#   HETZNER_TOKEN        (required)
#   HETZNER_LOCATION     (default: nbg1)
#   HETZNER_SERVER_TYPE  (default: cx23)
#   HETZNER_SSH_KEY      (default: laptop)  hcloud ssh-key name
#   HETZNER_IMAGE_ID     (optional; existing value is replaced on success)
#
# On success, writes the new snapshot ID back to .env.local.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [ ! -f .env.local ]; then
  echo "error: .env.local not found" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

: "${HETZNER_TOKEN:?HETZNER_TOKEN is required in .env.local}"
HETZNER_LOCATION="${HETZNER_LOCATION:-nbg1}"
HETZNER_SERVER_TYPE="${HETZNER_SERVER_TYPE:-cx23}"
HETZNER_SSH_KEY="${HETZNER_SSH_KEY:-laptop}"
PREVIOUS_IMAGE_ID="${HETZNER_IMAGE_ID:-}"

export HCLOUD_TOKEN="$HETZNER_TOKEN"

BUILDER_NAME="ghost-image-builder"
SNAPSHOT_DESC="ghost-gold-minecraft"
SSH_OPTS=(
  -o UserKnownHostsFile=/dev/null
  -o StrictHostKeyChecking=no
  -o LogLevel=ERROR
  -o ConnectTimeout=10
)

for cmd in hcloud bun scp ssh pnpm; do
  command -v "$cmd" >/dev/null || { echo "error: $cmd not installed" >&2; exit 1; }
done

SUCCESS=0
cleanup() {
  local ec=$?
  if ! hcloud server describe "$BUILDER_NAME" >/dev/null 2>&1; then
    exit $ec
  fi
  if [ "$SUCCESS" = "1" ]; then
    echo ">> deleting builder VM"
    hcloud server delete "$BUILDER_NAME" >/dev/null || true
  else
    echo
    echo "!! build failed. builder VM left running for inspection:"
    echo "!!   hcloud server ssh $BUILDER_NAME"
    echo "!! delete with:"
    echo "!!   hcloud server delete $BUILDER_NAME"
  fi
  exit $ec
}
trap cleanup EXIT INT TERM

if hcloud server describe "$BUILDER_NAME" >/dev/null 2>&1; then
  echo ">> removing stale builder from a previous run"
  hcloud server delete "$BUILDER_NAME" >/dev/null
fi

echo ">> building agent binary"
pnpm agent:build

echo ">> creating builder VM ($HETZNER_SERVER_TYPE @ $HETZNER_LOCATION)"
hcloud server create \
  --name "$BUILDER_NAME" \
  --type "$HETZNER_SERVER_TYPE" \
  --image ubuntu-24.04 \
  --location "$HETZNER_LOCATION" \
  --ssh-key "$HETZNER_SSH_KEY" >/dev/null

BUILDER_IP=$(hcloud server ip "$BUILDER_NAME")
echo ">> builder IP: $BUILDER_IP"

# Hetzner reuses IPs, so purge any stale host key before SSHing.
ssh-keygen -R "$BUILDER_IP" >/dev/null 2>&1 || true

echo ">> waiting for SSH"
for i in $(seq 1 60); do
  if ssh "${SSH_OPTS[@]}" "root@$BUILDER_IP" 'echo ok' >/dev/null 2>&1; then
    break
  fi
  sleep 2
  if [ "$i" -eq 60 ]; then
    echo "error: SSH never came up" >&2
    exit 1
  fi
done

echo ">> waiting for cloud-init to finish"
ssh "${SSH_OPTS[@]}" "root@$BUILDER_IP" 'cloud-init status --wait' >/dev/null 2>&1 || true

echo ">> copying agent + scripts"
scp "${SSH_OPTS[@]}" dist/ghost-agent            "root@$BUILDER_IP:/usr/local/bin/"
scp "${SSH_OPTS[@]}" scripts/ghost-agent.service "root@$BUILDER_IP:/etc/systemd/system/"
scp "${SSH_OPTS[@]}" scripts/build-image.sh      "root@$BUILDER_IP:/root/"
ssh "${SSH_OPTS[@]}" "root@$BUILDER_IP" \
  'chmod +x /usr/local/bin/ghost-agent /root/build-image.sh'

echo ">> running build-image.sh"
ssh "${SSH_OPTS[@]}" "root@$BUILDER_IP" 'bash /root/build-image.sh'

echo ">> shutting down builder"
hcloud server shutdown "$BUILDER_NAME" >/dev/null

for i in $(seq 1 60); do
  status=$(hcloud server describe "$BUILDER_NAME" -o format='{{.Status}}' 2>/dev/null || echo unknown)
  if [ "$status" = "off" ]; then
    break
  fi
  sleep 2
  if [ "$i" -eq 60 ]; then
    echo "error: VM never reached 'off' status" >&2
    exit 1
  fi
done

echo ">> creating snapshot"
CREATE_OUTPUT=$(hcloud server create-image \
  --type snapshot \
  --description "$SNAPSHOT_DESC" \
  "$BUILDER_NAME" 2>&1 | tee /dev/stderr)
SNAPSHOT_ID=$(printf '%s\n' "$CREATE_OUTPUT" | awk '/^Image [0-9]+/ {print $2; exit}')

if [ -z "$SNAPSHOT_ID" ]; then
  echo "error: could not parse snapshot ID from hcloud output" >&2
  echo "hint: find it with 'hcloud image list --type snapshot'" >&2
  exit 1
fi

if grep -q '^HETZNER_IMAGE_ID=' .env.local; then
  awk -v id="$SNAPSHOT_ID" '
    /^HETZNER_IMAGE_ID=/ { print "HETZNER_IMAGE_ID=" id; next }
    { print }
  ' .env.local > .env.local.tmp && mv .env.local.tmp .env.local
else
  echo "HETZNER_IMAGE_ID=$SNAPSHOT_ID" >> .env.local
fi

SUCCESS=1

echo
echo "=========================================="
echo " snapshot ready: $SNAPSHOT_ID"
echo " written to .env.local as HETZNER_IMAGE_ID"
if [ -n "$PREVIOUS_IMAGE_ID" ] && [ "$PREVIOUS_IMAGE_ID" != "$SNAPSHOT_ID" ]; then
  echo
  echo " previous image was $PREVIOUS_IMAGE_ID"
  echo " delete it with: hcloud image delete $PREVIOUS_IMAGE_ID"
fi
echo "=========================================="
