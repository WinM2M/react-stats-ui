# Contributing

Thanks for contributing to `@winm2m/react-stats-ui`.

## Development Setup

1. Install dependencies:

```bash
npm ci
```

2. Run local development build/watch:

```bash
npm run dev
```

3. Run Storybook:

```bash
npm run storybook
```

## Validation Before PR

Run all checks locally before opening a pull request:

```bash
npm run typecheck
npm run test:ci
npm run build
```

## Coding Guidelines

- Follow existing TypeScript + React patterns used in `src/`.
- Keep API additions reflected in `README.md`.
- Prefer small, focused commits.
- Add or update tests for behavioral changes.

## Pull Request Guidelines

- Use a clear title describing the change intent.
- Include a short summary of what changed and why.
- Link related issues when available.
- If UI behavior changed, include screenshots or a short recording.

## Commit Message Style

Use concise, imperative commit messages, for example:

- `Add external control API for runtime data and analysis execution`
- `Fix minimal layout result panel toggle behavior`

## Reporting Issues

When filing bugs, include:

- environment (browser, OS, Node version)
- reproduction steps
- expected vs actual behavior
- logs or screenshots when possible
