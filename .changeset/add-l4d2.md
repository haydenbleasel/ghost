---
"ghost": patch
---

Add Left 4 Dead 2 as a supported game. Uses the `left4devops/l4d2` image with a docker-compose inline `server.cfg` for cvars that need to survive map loads (`z_difficulty`, `sv_allow_lobby_connect_only`). Join passwords are disabled — L4D2's coop lobby flow drops clients after `sv_password` verification on direct connect, so servers stay private via unlisted IP/port instead.
