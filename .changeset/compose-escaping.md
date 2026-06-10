---
"ghost": patch
---

Harden docker-compose value escaping. `escapeComposeValue` only escaped double quotes, but values are emitted inside YAML double-quoted scalars where `\` is the escape character — a backslash in a server name or game setting (e.g. world name, MOTD) produced invalid YAML or terminated the scalar early, and embedded newlines could inject additional YAML lines into the root-run compose file. Backslashes are now escaped before quotes and control characters are stripped.
