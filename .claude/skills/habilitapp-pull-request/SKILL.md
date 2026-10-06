---
name: habilitapp-pull-request
description: Use in the HabilitApp repository to write the title and description of a pull request from the commits of the current branch, using the repository template, and open it with gh. Supports --base <branch> and --dry-run. Prefer this over the global pull-request command.
version: 1.0.0
---

# Pull request (HabilitApp)

Writes the PR title and description from what the branch really contains, and opens the PR.

## Arguments

- `--base <branch>`: base branch. Default: `main`. Call it `$BASE`.
- `--dry-run`: do not run `gh`. Print the title and the full body in a markdown block so the user can paste it.

## Steps

1. **Gather the facts**, in parallel:
   - `git branch --show-current`
   - `git log --no-merges --format="%h %s" origin/$BASE..HEAD`
   - `git diff --stat origin/$BASE...HEAD`
   - `git diff --no-merges origin/$BASE...HEAD`
   - Read `.github/pull_request_template.md`.
   If the branch has no commits beyond `$BASE`, stop and tell the user.

2. **Title.** Conventional-commit style, in English, imperative, under 72 characters. Example: `feat: add project base structure (API, web, CI)`.

3. **Description.** Fill the template sections in Spanish, keeping every section:
   - **Resumen**: 2 to 4 sentences with what changed and why. Add `Refs #n` for the issue. Use `Closes #n` only if merging the PR finishes the work.
   - **Qué incluye**: one bullet per meaningful change. Skip WIP and noise.
   - **Cómo probarlo**: concrete steps another team member can follow.
   - **Verificado**: tick only what was actually run in this session, and say what was not verified.
   - **Pendiente** and **Decisiones que conviene revisar**: what is missing and what was decided without confirmation. Write `--` if there is nothing.

4. **Open the PR** with the body from a file, to avoid shell escaping problems:
   `gh pr create --base $BASE --title "<title>" --body-file <file>`
   Then print the PR URL.

## Rules

- Never invent changes that are not in the diff.
- Never mark something as verified if it was not run.
- **No AI attribution anywhere**: no `Co-Authored-By`, no "Generated with Claude Code".
- If the PR state changes later (CI result, review, new commits), update the description with `gh pr edit`.
