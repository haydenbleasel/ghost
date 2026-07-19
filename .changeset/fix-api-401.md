---
"ghost": patch
---

Return 401 JSON from authenticated API routes when the session has expired instead of redirecting to the sign-in page — fetch/EventSource consumers were receiving the sign-in HTML with a 200, causing endless JSON parse errors and a dashboard that never noticed it was signed out; the server page poll now redirects to sign-in on 401
