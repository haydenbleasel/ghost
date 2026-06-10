---
"ghost": patch
---

Fix races between provisioning and deletion. Deleting a server while its VM create was in flight could leak the Hetzner VM forever (teardown saw no `providerServerId`, and the provision step's retry path skipped cleanup) and could mark the deleted server as "failed". Now the cancelled paths of `stepCreateProviderServer` delete the VM themselves, the post-create state update no longer clobbers teardown's "deleted" phase, `stepMarkFailed` skips deleted servers, and `waitForServerRunning` checks for cancellation before treating a vanished VM as a fatal provisioning error.
