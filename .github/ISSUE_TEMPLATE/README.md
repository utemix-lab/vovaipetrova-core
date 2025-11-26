# Issue Templates

This directory contains issue templates for GitHub.

## Available Templates

### Task
Use for tracking work items, features, or improvements. Includes fields for:
- Task description and scope
- Deliverables
- Lane selection (docs, infra, feat, fix, etc.)
- Sequence labels (for sequential tasks)
- Executor selection (Cursor, Copilot, Manual)

### Bug Report
Use for reporting bugs or issues. Includes:
- Bug description
- Steps to reproduce
- Expected vs actual behavior
- Environment information

### Feature Request
Use for suggesting new features or enhancements. Includes:
- Feature description
- Problem statement
- Proposed solution
- Alternatives considered

## Labels

### Lane Labels
- `lane:docs` — documentation work
- `lane:infra` — infrastructure, workflows, scripts
- `lane:feat` — new features
- `lane:fix` — bug fixes
- `lane:refactor` — code refactoring
- `lane:stories` — Stories episodes
- `lane:characters` — character work
- `lane:qa` — quality assurance
- `lane:composer` — Composer tasks

### Sequence Labels
- `seq:1` through `seq:10` — for marking sequential tasks

## Creating Labels

To create labels in the repository, run:

```bash
npm run labels:create
```

This requires:
- `GITHUB_TOKEN` environment variable (GitHub personal access token)
- `GITHUB_REPO` environment variable (defaults to `utemix-lab/vovaipetrova-core`)

The script will create or update all labels defined in `scripts/create-github-labels.mjs`.

