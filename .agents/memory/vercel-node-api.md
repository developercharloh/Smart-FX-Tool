---
name: Vercel Node API routing
description: Vercel monorepo API deployments when Express TypeScript detection fails.
---

When Vercel detects an Express TypeScript app in a monorepo and fails during emission, an isolated project root can prevent it from scanning the original TypeScript entrypoint. The project framework setting accepts registered preset slugs rather than generic values such as `other` or `null`. The `node` preset is valid, but it still needs a root server entrypoint; an `api/` function alone may not satisfy it. Expose the prebuilt app through a supported JavaScript entrypoint and build the bundle from the workspace root.

**Why:** Vercel first selected the TypeScript Express source and failed with `Emit skipped`. Attempts to set `other` and `null` were rejected. The `node` preset then reported no entrypoint until a root JavaScript app was provided; the resulting production API passed health and scanner checks.

**How to apply:** Check Vercel's selected entrypoint in build logs. If it is scanning an unsuitable TypeScript file, isolate the project root, add a supported JavaScript server entry, and verify the production project alias plus any frontend API rewrite.