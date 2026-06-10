---
"ghost": patch
---

Stop reporting transient provisioning errors as "Owner has not configured provider credentials". The catch in `stepCreateProviderServer` swallowed every error from the provider lookup (including DB blips) into a permanent `FatalError`; it now only converts `MissingProviderCredentialsError` and lets everything else retry.
