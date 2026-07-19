---
"ghost": patch
---

Return 401 JSON from the middleware for unauthenticated API requests instead of redirecting to the sign-in page — fetch and EventSource consumers were following the 307 and receiving sign-in HTML with a 200, which made the route-level 401 handling (and the dashboard's signed-out detection) unreachable
