# Repository Guidelines

## Project Structure & Module Organization

The repository is a pnpm workspace. pps/web contains the Next.js App Router UI (pp routes, components, lib, local tests). Shared logic lives under packages: core (domain schemas and services), ff (request orchestration), dapters (Supabase and other gateways), and generated (OpenAPI output—regenerate only). API specs sit in openapi, developer notes in docs, and tooling lives in scripts/ and .husky/.

## Build, Test, and Development Commands

Use Node 22 with pnpm 9. Install dependencies once with pnpm install. pnpm dev runs code generation then Wrangler dev; switch backend modes with pnpm dev:monolith or pnpm dev:service. pnpm build compiles packages and the web bundle, while pnpm build:packages targets libraries only. For contract updates, run pnpm generate and guard against drift through pnpm generate:check.

## Coding Style & Naming Conventions

TypeScript is required. Prettier enforces 2-space indentation, 80-character lines, single quotes, trailing commas, and semicolons (pnpm format, pnpm format:check). ESLint (see .eslintrc.js) keeps import order and layer access: web → bff/generated/adapters, bff → core/generated/adapters, core → adapters, adapters/generated accept no inward dependencies. Follow Next.js filenames (page.tsx, layout.tsx,
oute.ts) and use PascalCase components, camelCase values, snake_case only for environment keys.

## Testing Guidelines

Vitest powers unit tests; run every suite with pnpm test or scope via pnpm --filter web test. UI specs live in pps/web/**tests**, utilities can colocate .test.ts files beside sources. Playwright covers end-to-end flows through pnpm test:e2e; prepare data under pps/web/test fixtures. Ensure pnpm generate has run so mocks align with schemas, and record coverage deltas in PRs when behavior changes.

## Commit & Pull Request Guidelines

History follows Conventional Commits (eat:, ix:, chore:). Keep subjects imperative and ≤72 chars; add scopes when touching a package (eat(core): authorize session). Squash WIP commits before opening a PR. In pull requests, supply: purpose summary, linked issue key, screenshots or terminal output for user-facing changes, and a checklist of commands you ran (lint, type-check, unit, e2e if applicable). Flag configuration edits (.dev.vars, wrangler.toml) so reviewers can plan secret rotations.

## Environment & Configuration

Copy .dev.vars.example to .dev.vars and fill Cloudflare + Supabase secrets before running pnpm dev. Avoid editing packages/generated or committing caches (pps/web/.next, .open-next,
ode_modules/.cache). Wrangler reads bindings from wrangler.toml and [env.development]; adjust per-environment values there, never in source. Coordinate schema changes with API owners so openapi/openapi.yaml and generated clients stay in sync.
