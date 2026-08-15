# Contributing to MedBuc

This document defines the standard development and security workflow for this repository. Follow it for every modification, review, bug fix, and new feature unless the repository owner explicitly approves a different process.

## Core rules

- `master` is the stable, deployable branch. Never commit or push directly to it.
- Every change uses a focused branch, a pull request, human inspection, and passing CI.
- Keep pull requests small enough to understand and revert safely.
- Do not mix unrelated cleanup, generated files, or local tooling into a feature pull request.
- Working behavior is necessary but not sufficient: inspect correctness, security, privacy, accessibility, and product impact before merging.
- Generated changes receive the same scrutiny as any external contribution. Never merge them only because they compile or pass tests.
- Commits use the responsible contributor's configured Git identity. Do not add tool-generated author or co-author attribution.

## Responsibilities

### The repository owner must

- decide whether the proposed behavior is desirable;
- inspect the pull request's changed files and user-visible behavior;
- confirm high-risk findings are resolved or explicitly accepted;
- make the final merge and release decision;
- approve destructive actions, production data changes, secret changes, billing changes, and security-sensitive migrations.

### A coding assistant may

- inspect the repository and explain the current state;
- create a focused branch and implement an approved change;
- add or update tests that reproduce the relevant behavior;
- run local validation and review the diff;
- commit with the configured human Git identity, push the branch, and open a draft pull request when authorized;
- inspect pull-request checks, review feedback, and security boundaries;
- prepare fixes or a revert pull request.

A coding assistant must not merge, deploy, rewrite published history, delete material data, change production permissions, or perform a rollback without explicit authorization.

## 1. Start from current `master`

Before changing files:

```bash
git switch master
git fetch origin
git pull --ff-only origin master
git status --short --branch
```

Expected result: local `master` matches `origin/master`. Investigate unexpected modified or untracked files before continuing; never discard them blindly.

Create a neutral, descriptive branch:

```bash
git switch -c feature/short-description
```

Use one of these prefixes:

- `feature/` for new user-facing behavior;
- `fix/` for defects;
- `security/` for security hardening;
- `docs/` for documentation;
- `maintenance/` for tooling and internal cleanup.

Do not reuse an already merged branch for new work.

## 2. Define and inspect the scope

Before implementation, state:

- the user-visible outcome;
- which files or systems are expected to change;
- what must remain unchanged;
- the validation required;
- whether the change meets any high-risk trigger below.

Inspect the working tree frequently:

```bash
git status --short
git diff
git diff --check
```

Do not use `git add .` or `git add -A` in a mixed working tree. Stage explicit paths so unrelated local files cannot enter the commit.

## 3. Implement with regression protection

- Preserve established architecture and naming conventions.
- Derive displayed figures from real user activity or real content; do not introduce plausible-looking demo values.
- For a user-visible bug, add a test that fails with the broken behavior and passes with the fix.
- Test loading, empty, error, retry, and account-transition states when relevant.
- Do not weaken validation, row-level security, authentication gates, or error handling to make a feature work.
- Keep database migrations append-only. Never edit a migration that may already have run in another environment.

## 4. Validate locally

Run the same gates used by GitHub Actions:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The supported runtime is Node.js 22.19 or newer; CI uses Node.js 24.

Also test the changed workflow manually in the browser. Verify both desktop and mobile behavior when layout or interaction changes. Automated checks do not replace functional acceptance.

Do not commit while a relevant check fails. Treat new warnings as findings to resolve or justify, even when CI technically passes.

## 5. Review before committing

Review the complete diff as if it came from an unfamiliar contributor:

```bash
git diff --stat
git diff
git diff --check
```

For generated changes, inspect at minimum:

- every changed and newly added file;
- unexpected dependencies, network calls, storage access, or environment variables;
- authentication and authorization assumptions;
- database queries and user-data boundaries;
- error, loading, empty, retry, and cancellation behavior;
- exam timing, scoring, submission, and persistence semantics;
- accessibility, keyboard behavior, focus, and responsive layout;
- test assertions, including whether they would fail against the broken implementation;
- generated copy, labels, percentages, and Romanian numerical agreement;
- unrelated files, secrets, build artifacts, local configuration, or attribution trailers.

## 6. Commit intentionally

Stage only the reviewed files:

```bash
git add -- path/to/file path/to/another-file
git diff --cached --check
git diff --cached --name-status
```

Commit with a short description of the outcome:

```bash
git commit -m "Add real progress tracking"
```

Verify the author and message:

```bash
git show -s --format="%H%n%an <%ae>%n%B" HEAD
```

## 7. Push and open a draft pull request

```bash
git push -u origin "$(git branch --show-current)"
```

Open a pull request into `master` as a draft. Its description must explain:

- what changed;
- why it changed;
- user and developer impact;
- the root cause for a bug fix;
- security and privacy implications;
- local checks performed;
- manual behavior that still needs confirmation.

Do not mark the pull request ready until the diff and user-visible behavior have been reviewed.

## 8. Review the pull request

On GitHub:

1. Open the pull request and select **Files changed**.
2. Confirm the base is `master` and the head is the intended branch.
3. Inspect every changed file; use **Viewed** only after reading it.
4. Confirm no unrelated files, secrets, local configuration, generated artifacts, or unexpected migrations are present.
5. Open **Checks** or **Show all checks** and verify `Lint, typecheck, teste și build` passes.
6. Resolve review conversations with code or a documented decision.
7. Repeat relevant browser acceptance checks against the final branch state.

When all findings are resolved, mark the pull request ready for review.

## 9. Extra review for high-risk changes

Perform an explicit security review before marking the pull request ready and again before release when a change touches:

- authentication, password recovery, sessions, tokens, or account deletion;
- roles, administrator access, permissions, RLS policies, grants, or `security definer` functions;
- subscriptions, payments, billing, webhooks, refunds, or entitlement checks;
- exams, timers, scoring, answer locking, submission, or persisted attempts;
- personal data, profiles, notes, exports, deletion, telemetry, logs, or error reporting;
- database schemas, migrations, RPCs, queries, storage, backups, or retention;
- secrets, environment variables, third-party integrations, or dependency changes;
- CI, deployment, domains, security headers, or production configuration.

The security review must answer:

- Who is allowed to perform this action?
- Is authorization enforced by the server or database rather than only the UI?
- Can one user read or modify another user's data?
- What happens on retries, duplicate requests, partial failure, refresh, or account switching?
- Are secrets, tokens, personal data, answers, or internal errors exposed?
- Is the action auditable and safely reversible?
- Do tests cover both permitted and forbidden behavior?

Database permission changes require tests that exercise the real policy boundary. Client-side filtering is never an authorization control.

## 10. Merge safely

Merge only when:

- the pull request is ready, not draft;
- the branch is up to date with `master`;
- all required checks pass;
- review conversations are resolved;
- functional acceptance is complete;
- required security review is complete;
- the repository owner explicitly approves the merge.

Prefer **Squash and merge** for a focused pull request. This keeps `master` linear and produces one reversible project commit.

After merging, verify both the post-merge CI workflow and the GitHub Pages deployment. A successful pull-request check does not prove the production deployment succeeded.

## 11. Synchronize and clean up

After a verified merge:

```bash
git switch master
git pull --ff-only origin master
```

Compare the merged feature branch with `master` before deleting it. Delete only the branch that belongs to the completed pull request. Preserve unrelated branches and untracked files until their purpose is understood.

## 12. Revert a bad change

Never rewrite or force-push `master` to undo a deployed change.

The safest rollback is a new revert pull request:

1. Open the merged pull request on GitHub.
2. Select **Revert** near the merge summary.
3. Review the inverse diff in the newly created pull request.
4. Run the normal CI, functional, and security review.
5. Merge the revert pull request after explicit approval.
6. Confirm post-merge CI and deployment.

For an urgent rollback prepared locally, create a `fix/` or `security/` branch from current `master`, use `git revert` on the exact merge commit, and publish it through the same pull-request gates. Do not use `git reset --hard` or bypass branch protection.

## Branch protection

The repository ruleset for `master` must remain active and require:

- changes through a pull request;
- resolution of review conversations;
- the `Lint, typecheck, teste și build` status check;
- an up-to-date branch;
- blocked force pushes and branch deletion.

For a solo-maintained repository, zero required approving reviews avoids an impossible self-approval requirement. Human inspection and explicit merge approval are still required by this workflow.

## Definition of done

A change is complete only when:

- its scope is implemented and manually accepted;
- relevant tests exist and all local checks pass;
- the pull-request diff has been inspected;
- CI passes on the final commit;
- high-risk review is complete when applicable;
- the repository owner approves the merge;
- post-merge CI and deployment succeed;
- local `master` is synchronized and the merged branch is safely cleaned up.
