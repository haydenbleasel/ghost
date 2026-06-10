---
"ghost": patch
---

Return 400 instead of an unhandled 500 when the heartbeat, events, or command-ack agent routes receive a signed request with a malformed JSON body. `JSON.parse` sat outside the routes' error handling, unlike the other agent endpoints.
