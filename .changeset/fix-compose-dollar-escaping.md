---
"ghost": patch
---

Escape dollar signs in generated docker compose files — Docker Compose interpolates $VAR/${VAR} in every string, so a server name like 'Ca$h Grab' was silently mangled and an unclosed '${' made compose fail to start entirely; applies to all games including Factorio's literal config blocks
