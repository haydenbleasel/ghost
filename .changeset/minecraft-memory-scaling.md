---
"ghost": patch
---

Size the Minecraft JVM heap from the actual machine instead of a hardcoded `6G`. Rescaling a Minecraft server previously had no effect on the game (and on machines smaller than the default the fixed heap could exceed total RAM). The compose builder now receives the provider-reported machine memory and gives the JVM ~75% of it; the heap is applied whenever a new compose is pushed (install and settings updates).
