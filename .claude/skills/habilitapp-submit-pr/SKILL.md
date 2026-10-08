---
name: habilitapp-submit-pr
description: Use in the HabilitApp repository when the user says "sube un PR", "abre un PR", "create a PR", "submit a PR" or asks to commit, push and open a pull request. Branches from main, checks, commits and opens the PR on GitHub. Prefer this over the global submit-pr, which belongs to another project.
version: 1.0.0
---

# Submit PR (HabilitApp)

Full flow to take the changes of this session to a pull request against `main`. It stops and asks whenever something is unclear. It never pushes to `main`.

## Steps

1. **Check the GitHub account.** Run `gh auth status` and confirm the active account is the one that owns the repository. If not, tell the user to run `! gh auth switch --user <account>` and stop.

2. **Branch.** Run `git fetch origin`. If the current branch is already a work branch for this task, stay on it. Otherwise create one from `origin/main` with `git switch --no-track -c <branch> origin/main`.
   - Prefixes: `feature/`, `fix/`, `chore/`, `hotfix/`.
   - Short, descriptive name in English: `feature/issuer-list`.

3. **Stage only what belongs to this task.** Add files by name. Never `git add -A` or `git add .`. Never stage `.env*`, `.claude/settings.local.json`, `.DS_Store` or files unrelated to the task. If a file is unclear, ask.

4. **Check.** Run `pnpm check`. If the API changed, also run `pnpm test:e2e` (PostgreSQL must be up). If something fails because of these changes, fix it. If it fails for another reason, report it and stop. Never open a PR with a red check.

5. **Automated review.** Invoke `/code-review` on the staged diff at effort `high`.
   - If there are findings that need changes, apply them, re-stage and run the review once more. Do not loop more than once; list what remains for the user.
   - Never block the PR for style preferences or low-confidence suggestions. Only for correctness bugs or clear violations of `CLAUDE.md`.

6. **Commit.** One commit per topic, following the commit rules in `CLAUDE.md`: conventional prefix, English, imperative, optional body explaining why.
   - **No `Co-Authored-By` and no AI attribution of any kind.**

7. **Push** with `git push -u origin <branch>`. If the permission system denies it, give the user the exact command to run with `!` and wait. Do not look for workarounds.

8. **Open the PR** following the `habilitapp-pull-request` skill, with base `main`.

9. **Kanban.** If the work belongs to an issue (`HU-nn` or `TA-nn`), reference it with `Refs #n`. If every acceptance criterion is met, move its card to `Review` on the project board. Do not close the issue and do not move it to `Done`: that needs a review by another team member.

10. **Report.** Wait for `gh pr checks` to finish and give the user the PR URL and the result of the checks.

## Notes

- Never push to `main`.
- If `gh` is not available, give the user the GitHub URL to open the PR manually.
