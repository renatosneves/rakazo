# OpenCode worker rules for Rakazo (Renato's fork)

These rules are added on top of the repository's own `AGENTS.md` and `CONTRIBUTING.md`, which you must also follow. You are the executor: the orchestrator (Claude) writes the plan and reviews your work. Follow the plan, and don't widen its scope.

## 1. Identity and history

- Author and commit as `Neves <48067969+renatosneves@users.noreply.github.com>`. Never use an "OpenCode" or tool identity.
- Don't add `Co-Authored-By`, `Claude-Session` or any other tool trailer.
- Before every push, check the author:

  ```bash
  git log --format='%an <%ae> | %cn <%ce>' upstream/main..HEAD
  ```

  Every line must show Neves.
- Force-push only your own PR branches, and only with `--force-with-lease`. The only thing you may push to `main` or `upstream-main` is an exact copy of `upstream/main` (section 2a). Never push your own commits there.

## 2. Branches and PRs

- Remotes:
  - `origin` = `renatosneves/rakazo` (the fork)
  - `upstream` = `elie222/rakazo`
- Run `git fetch upstream main` at the start of every task.
- One PR = one focused change. Each branch starts from `upstream/main`, never from the fork's `main` or from another PR branch. Don't stack PRs, and don't merge one PR branch into another, even when two PRs touch the same file. Say in the description that the other PR touches the same file.
- Fork PRs target the `upstream-main` branch, which mirrors upstream `main`. Refresh it before opening a PR:

  ```bash
  git push --force-with-lease origin upstream/main:refs/heads/upstream-main
  ```

- Keep each PR to one or two commits named `type(scope): summary`.

## 2a. Branch housekeeping (start of every task)

Upstream squash-merges PRs, so a merged branch is never an ancestor of `upstream/main`. Don't use `git branch --merged` to decide anything.

1. Refresh:

   ```bash
   git fetch upstream main
   git fetch origin --prune
   ```

2. Mirror upstream. The fork's `main` and `upstream-main` must both equal `upstream/main`:

   ```bash
   git log --oneline upstream/main..origin/main
   git log --oneline upstream/main..origin/upstream-main
   ```

   - If both print nothing, push the mirror for each:
     ```bash
     git push --force-with-lease origin upstream/main:refs/heads/main
     git push --force-with-lease origin upstream/main:refs/heads/upstream-main
     ```
   - If either prints commits, don't push. Report the commits to the orchestrator. Someone put work there, and a mirror push would delete it.

3. Never merge a fork PR. Fork PRs are only for review. The real PR is the upstream one, and only the upstream maintainer merges it. A fork PR merged into `upstream-main` breaks the mirror.

4. Find your branches whose work is merged upstream. A branch counts as merged only when **both** checks pass:
   - its upstream PR shows as merged:
     ```bash
     gh pr list --repo elie222/rakazo --author renatosneves --state merged --json number,headRefName
     ```
     If `gh` isn't available, check the PR page on GitHub.
   - applying it to `upstream/main` changes nothing:
     ```bash
     test "$(git merge-tree --write-tree upstream/main origin/<branch>)" = "$(git rev-parse upstream/main^{tree})" && echo merged
     ```
     If this prints nothing, upstream changed the code after the merge. Look at `git diff upstream/main...origin/<branch>` and say whether every change is already upstream. When unsure, keep the branch.

5. Delete only branches that pass both checks and aren't protected. First save the SHA in your report, then delete:

   ```bash
   echo "<branch> $(git rev-parse origin/<branch>)"
   git push origin --delete <branch>
   ```

   Anyone can restore a branch with `git push origin <sha>:refs/heads/<branch>`.

6. Protected branches. Never delete or rewrite these:
   - `main`, `upstream-main`, `fold7-apk`;
   - any `claude/*` branch, which belongs to the orchestrator. `claude/project-thread-da55l3` holds this rules file;
   - any branch with an open PR, on the fork or upstream;
   - any branch you didn't create, unless the orchestrator names it.

   List everything else that looks stale in your report, and don't delete it.

7. Rebase open PR branches. For each of your branches with an open upstream PR:
   - check whether it still merges cleanly: `git merge-tree --write-tree upstream/main origin/<branch>` exits 0;
   - if it conflicts, or if upstream changed the same files since your last push, rebase it onto `upstream/main`;
   - then run the full checks (section 9) and push with `--force-with-lease`;
   - don't rebase a branch that merges cleanly just to move it forward, because that dismisses reviews for nothing.

8. Never branch from or push to `fold7-apk` unless the orchestrator asks. It's Renato's test APK branch.

## 3. Before writing code

1. Read the files you'll change on **current `upstream/main`**, not on an old base.
2. Run `git log upstream/main -- <file>` for each file. If upstream already changed the same behaviour recently, build on it, and say so to the orchestrator instead of overriding it.
3. Search for an existing helper before writing a new one. Known ones:
   - `useAppForeground()` / `isForegroundState()` in `apps/mobile/lib/app-foreground.ts`, for pause/resume in the background. Pause only on `background`, never on `inactive`.
   - `native.*` and `useMobileTokens()` for colours. `native.fillPressed` is the Android ripple colour.
   - `@expo/ui/community/menu` (`MenuView`) and `@expo/ui/community/bottom-sheet` for menus and sheets. Never hand-build a sheet with `Modal`.
   - The existing `t()` catalogue strings, before adding new ones.
4. If the same logic would appear twice, make one shared helper or hook.

## 4. Scope: don't change product behaviour on the side

- Fix only what the task names.
- Removing a visible feature, adding a visible feature, or changing a default needs the orchestrator's explicit OK first. Examples: removing a live preview, stopping a first-run permission prompt, adding a new settings row.
- No vendor SDKs or vendor-specific env vars (e.g. Sentry). AGENTS.md requires the core product to run with no hosted vendor.
- Version bumps follow upstream `docs/mobile-release.md`. Bump `expo.version` (and `android.versionCode`) when a PR changes native code, config plugins, permissions or native dependencies, **unless upstream `main` already carries an unreleased bump**. Never bump for JS-only changes. The orchestrator says which PR in a batch carries the bump.
- Pin new dependencies to an exact version, like their siblings (no `~` or `^`), and use the version that matches the Expo SDK in use.

## 5. Code quality

- No dead code. Delete unused helpers, parameters and options; don't keep them "for older callers".
- No abstraction without a caller (e.g. a pluggable reporter nobody plugs in).
- Tests must check behaviour. Don't write tests that only re-assert constants.
- Theme tokens only. Never hardcode a colour (`#…`, `rgb(…)`, `rgba(…)`).
- On Android, if you add a ripple, remove the parallel pressed opacity there. iOS must stay exactly as it was, including styles you add for Android.
- Use top-level `import type`.

## 6. Text, translation and copy

- Every visible word is UI. Don't add copy that repeats what the control already shows.
- Any new `t()` string, and any new Android string resource, must exist for **every** locale in `UI_LOCALES` (`apps/mobile/lib/ui-locale.ts`; currently `en`, `zh-CN`, `ru`, `de`, `nl`). Android resource folders: `values`, `values-zh-rCN`, `values-ru`, `values-de`, `values-nl`.
- Native Android copy must follow the app's chosen language (passed from JS), not the phone's language.
- Quote every new user-facing string in the PR description and say why it can't be removed or shown only when relevant.

## 7. Android native code

- Request any runtime permission a foreground service needs (e.g. `RECORD_AUDIO` for type `microphone`) **before** starting the service. Check it again in `onStartCommand`.
- Wrap `startForeground` in try/catch with `stopSelf()`.
- Catch and log `startService` failures from the background instead of throwing.
- You may not have an Android SDK. In that case, at least compile pure Kotlin logic on a plain JVM, and say clearly in your report that the module itself wasn't compiled. Never claim it builds if you didn't build it.

## 8. File encoding (you are on Windows: this has broken a build before)

- Write every file as **UTF-8 without BOM**, with LF line endings.
- Don't pass file contents through PowerShell `Get-Content`/`Set-Content`/`Out-File`. Use the editor tool or git.
- Use escapes for invisible or special characters in code, e.g. `''`, rather than literal characters.
- Before every push, these two must print nothing:

  ```bash
  git diff upstream/main -- . | grep -n $'^+\xEF\xBB\xBF'
  git diff upstream/main -- . | grep -nP '^\+.*(Ã.|â€|â†|î€)'
  ```

## 9. Checks before every push

Run from the repo root and fix every failure. Never skip, disable or weaken a test.

```bash
pnpm lint
pnpm check
pnpm --filter @rakazo/mobile test
```

Then:
- run the two encoding checks;
- run the author check;
- read your own `git diff upstream/main` once, end to end.

Don't run the desktop Playwright e2e suite (AGENTS.md).

## 10. PR descriptions

- Use three headings: **Why** (the product reason), **What changed** and **How it was tested**. Describe test results in words; don't paste tool output.
- Don't reference internal reports, finding IDs, local paths, machine names, emails or session links.
- Never mention copying another product's style or design.
- For UI changes, link the CI E2E screenshot. For native-only mobile UI that CI can't capture, say so.

## 11. When you're stuck or the plan looks wrong

Stop that task. Don't improvise a different design. Note what you found, finish the other tasks, and include it in your report.

## 12. Report back to the orchestrator

Report the branch housekeeping first:
- whether the mirrors were refreshed, or which commits blocked them;
- each branch you deleted, with its SHA and upstream PR number;
- the stale branches you kept, and why;
- the branches you rebased.

Then, for each PR, report:
- the branch and head SHA;
- the author check result;
- the encoding checks result;
- lint, type check and mobile tests, in words;
- anything you didn't build or test (e.g. native Android) and why;
- any task you stopped on.
