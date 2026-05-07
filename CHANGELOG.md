# ghost

## 1.1.0

### Minor Changes

- [#47](https://github.com/haydenbleasel/ghost/pull/47) [`6080d27`](https://github.com/haydenbleasel/ghost/commit/6080d27c1f851d93c93df604c0450932eca5836c) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Add support for Counter-Strike 2 dedicated servers. Configurable game mode, starting map, max players, bot quota and difficulty, LAN mode, and Steam GSLT for public servers.

- [#47](https://github.com/haydenbleasel/ghost/pull/47) [`6080d27`](https://github.com/haydenbleasel/ghost/commit/6080d27c1f851d93c93df604c0450932eca5836c) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Add support for Don't Starve Together dedicated servers. Configurable game mode, server intention, max players, PvP, and Klei cluster token.

- [#47](https://github.com/haydenbleasel/ghost/pull/47) [`6080d27`](https://github.com/haydenbleasel/ghost/commit/6080d27c1f851d93c93df604c0450932eca5836c) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Add support for Satisfactory dedicated servers.

- [#47](https://github.com/haydenbleasel/ghost/pull/47) [`6080d27`](https://github.com/haydenbleasel/ghost/commit/6080d27c1f851d93c93df604c0450932eca5836c) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Add support for V Rising dedicated servers.

### Patch Changes

- [`743f3c0`](https://github.com/haydenbleasel/ghost/commit/743f3c03315d55c8687d3c9d1a91c5acbd279393) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Pin `zod` to `4.3.6` to match the version expected by `@workflow/world` and `@workflow/world-vercel`. Zod 4.4 changed how discriminated unions handle fields overridden with `z.undefined()` via `.extend()`, causing the workflow runtime to throw `Schema validation failed for POST /v3/runs/.../events` on every callback and leaving runs wedged in the `pending` state.

## 1.0.0

### Major Changes

- [`fe9c356`](https://github.com/haydenbleasel/ghost/commit/fe9c356a154b1b23fa1e70820a073637c2f21813) Thanks [@haydenbleasel](https://github.com/haydenbleasel)! - Initial release
