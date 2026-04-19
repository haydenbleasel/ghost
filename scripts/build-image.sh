#!/usr/bin/env bash
# Build the Ghost gold image on a fresh Hetzner Ubuntu 24.04 VM.
#
# One-shot setup:
#   1. Create a throwaway Hetzner server from `ubuntu-24.04`.
#   2. Copy ./dist/ghost-agent (Bun-compiled linux binary) to the VM:
#        scp ./dist/ghost-agent root@<ip>:/usr/local/bin/
#        scp ./scripts/ghost-agent.service root@<ip>:/etc/systemd/system/
#        scp ./scripts/build-image.sh root@<ip>:/root/
#   3. ssh root@<ip> 'bash /root/build-image.sh'
#   4. Once finished (clean shutdown), create the snapshot:
#        hcloud server shutdown <id>
#        hcloud server create-image --type snapshot --description 'ghost-gold' <server>
#   5. Capture the snapshot ID into HETZNER_IMAGE_ID in your Vercel env.
#   6. Delete the throwaway server.
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get -y upgrade
apt-get -y install ca-certificates curl gnupg ufw

# Remove any distro Docker packages so Docker Inc's official ones install cleanly
for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do
  apt-get -y remove "$pkg" 2>/dev/null || true
done

# Add Docker's official apt repo (ships docker-compose-plugin; Ubuntu 24.04's own repos don't)
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker

# Firewall baseline (cloud-init will open per-game ports on first boot)
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw --force enable

# Layout
mkdir -p /etc/ghost /var/lib/ghost/game
chmod 700 /etc/ghost /var/lib/ghost

# Agent binary and service expected to have been scp'd in before this script runs
test -x /usr/local/bin/ghost-agent || { echo 'missing agent binary'; exit 1; }
test -f /etc/systemd/system/ghost-agent.service || { echo 'missing service unit'; exit 1; }

systemctl daemon-reload
systemctl enable ghost-agent.service

# Pre-pull game images so first provision is instant.
# Keep in sync with games/<game>/install.ts `image:` fields.
docker pull itzg/minecraft-server:latest
docker pull lloesche/valheim-server:latest
docker pull thijsvanloef/palworld-server-docker:latest
docker pull sknnr/enshrouded-dedicated-server:latest
docker pull didstopia/rust-server:latest
docker pull ryshe/terraria:latest

# Minimize image size
apt-get clean
rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
truncate -s 0 /var/log/*log /var/log/**/*log || true

# Clean cloud-init so it re-runs on next boot from snapshot
cloud-init clean --logs || true

echo "Image build complete. Run 'shutdown -h now' then snapshot the server."
