import "server-only";

const SYSTEMD_UNIT = `[Unit]
Description=Ghost Agent
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
ExecStart=/usr/local/bin/ghost-agent
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production
ReadWritePaths=/var/lib/ghost /etc/ghost /usr/local/bin
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
`;

const indent = (text: string, spaces: number): string => {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line.length > 0 ? pad + line : line))
    .join("\n");
};

export const buildSnapshotCloudInit = (agentBinaryUrl: string): string => {
  const buildScript = `#!/usr/bin/env bash
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get -y upgrade
apt-get -y install ca-certificates curl gnupg ufw

for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do
  apt-get -y remove "$pkg" 2>/dev/null || true
done

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \${VERSION_CODENAME} stable" \\
  > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw --force enable

mkdir -p /etc/ghost /var/lib/ghost/game
chmod 700 /etc/ghost /var/lib/ghost

curl -fsSL "${agentBinaryUrl}" -o /usr/local/bin/ghost-agent
chmod +x /usr/local/bin/ghost-agent

systemctl daemon-reload
systemctl enable ghost-agent.service

docker pull itzg/minecraft-server:latest
docker pull lloesche/valheim-server:latest
docker pull thijsvanloef/palworld-server-docker:latest
docker pull sknnr/enshrouded-dedicated-server:latest
docker pull didstopia/rust-server:latest
docker pull ryshe/terraria:latest

apt-get clean
rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
truncate -s 0 /var/log/*log /var/log/**/*log || true
cloud-init clean --logs || true

shutdown -h now
`;

  return `#cloud-config
write_files:
  - path: /etc/systemd/system/ghost-agent.service
    owner: root:root
    permissions: '0644'
    content: |
${indent(SYSTEMD_UNIT, 6)}
  - path: /root/build-image.sh
    owner: root:root
    permissions: '0755'
    content: |
${indent(buildScript, 6)}
runcmd:
  - bash /root/build-image.sh
`;
};
