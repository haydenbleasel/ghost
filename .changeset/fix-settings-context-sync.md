---
"ghost": patch
---

Keep saved game settings visible after tab navigation — a successful save only updated the form's local state, so switching tabs and returning showed the stale pre-save values (and the 5-second poll never refreshed settings either); the save now updates the shared server context and the poll carries settings through
