---
"ghost": patch
---

Remove the advertised Bedrock port (19132-19133/udp) from Minecraft — the compose file runs a plain Java server that never listens on it, so the connect panel and firewall advertised a dead port
