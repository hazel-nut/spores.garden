# Contributing

## Setup

```bash
npm install
npm run dev
```

## Quality Gates

Before opening a PR:

```bash
npm run typecheck:strict
npm run test:run
npm run build
```

Or run everything at once:

```bash
npm run check
```

## Branch + PR Workflow

- Branch from `main`.
- Keep each branch focused to one change set.
- Use clear, imperative commit messages.
- Open PRs against `main` and request review before merge.

## Code Style

- TypeScript ES modules.
- 2-space indentation and semicolons.
- Kebab-case filenames in `src/`.
- Keep UI behavior changes covered by tests where practical.

## Documentation

Update docs together with behavior changes:

- `readme.md` for user-facing behavior and commands.
- `docs/` for implementation details and migration plans.
