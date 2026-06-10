---
"ghost": patch
---

Close the console log stream on unmount. `LogsStream`'s effect cleanup only set a flag and never closed the live `EventSource` or cleared the pending reconnect timer, so navigating away from the Console tab left the SSE connection (and the server's 500ms log poll loop) running for up to the route's 300s `maxDuration`, with stale listeners still updating state.
