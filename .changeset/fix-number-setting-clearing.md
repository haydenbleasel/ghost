---
"ghost": patch
---

Allow number settings (e.g. Max players) to be cleared while retyping — the input snapped back to the previous value on backspace, so typing "1" after clearing "6" produced 61; the field now tracks the raw text while focused and commits valid numbers
