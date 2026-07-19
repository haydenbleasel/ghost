---
"ghost": patch
---

Clean up the temporary .part download when installing a file from URL fails at the final rename step, instead of leaking up to 500MB per failed attempt into the game data directory
