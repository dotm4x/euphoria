# Packages

The workspace is built from small packages. Each one keeps its own README,
dependencies and scripts, and together they make up the project.

## @euphoria/engine

The open game engine behind Euphoria. A browser-native runtime for building
two-dimensional games today, and three-dimensional experiences as the engine
matures.

Read the [engine README](./engine/README.md).

## Conventions

Packages extend the shared `tsconfig.base.json`, keep their own tooling and
tests, and are checked from the workspace root with `pnpm lint`,
`pnpm typecheck` and `pnpm format:check`. See
[CONTRIBUTING.md](../CONTRIBUTING.md) for the conventions in full.
