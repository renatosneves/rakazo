# Rebase #7 or #10 after the other one merges (instructions for OpenCode)

Use this when upstream (elie222/rakazo) has merged **either** the notification-polling PR (fork #7, branch `fix/android-notification-service`) **or** the notification-language PR (fork #10, branch `fix/notification-localization`). You then update the **other** branch. Your standing rules in `plans/opencode-worker-rules.md` apply: author Neves, UTF-8 without BOM, `--force-with-lease`, full checks.

## What you're dealing with

The orchestrator test-merged both branches. There is exactly **one** conflict, in

`apps/mobile/modules/rakazo-notifications/android/src/main/java/com/rakazo/notifications/RakazoNotificationService.kt`

at the start of `onStartCommand`. Both PRs add a line there. The correct resolution **keeps both lines, in this order**:

```kotlin
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.getBooleanExtra(EXTRA_RESET_TOKEN, false) == true) cachedToken = null
    // Channel names follow the current locale; recreating an existing channel updates its copy.
    createChannels(localizedContext(NotificationStorage(this).locale))
    val generation = synchronized(sessionLock) {
```

Everything else merges automatically, including `apps/mobile/lib/android-platform-contract.test.ts`. With this resolution, the contract and resource tests and lint pass (orchestrator-verified).

If upstream changed anything else in this file before or while merging, expect more conflicts. Resolve each one in favour of upstream's code, then re-apply only your PR's change. If one is unclear, stop and report it; don't guess.

## Steps

1. Check which PR merged:
   ```bash
   git fetch upstream main
   git log --oneline upstream/main -- apps/mobile/modules/rakazo-notifications/android/src/main/java/com/rakazo/notifications/RakazoNotificationService.kt | head -5
   ```
   Work on the branch that is **not** merged yet:
   - polling merged → rebase `fix/notification-localization`
   - language merged → rebase `fix/android-notification-service`
2. Rebase that branch onto upstream:
   ```bash
   git checkout <branch>
   git rebase upstream/main
   ```
3. When the conflict appears, edit the file so the block above is exactly as shown. Remove all conflict markers. Then:
   ```bash
   git add <file>
   git rebase --continue
   ```
4. Confirm that nothing else changed by accident:
   - `git diff upstream/main -- <file>` must show only this PR's own changes. The other PR's lines are now part of upstream and must not appear as removed.
   - `grep -c '<<<<<<<\|>>>>>>>' <file>` must print `0`.
5. Run the standard checks:
   - `pnpm lint`
   - `pnpm check`
   - `pnpm --filter @rakazo/mobile test`
   - the two encoding checks
   - the author check (every commit shows `Neves <48067969+renatosneves@users.noreply.github.com>`)
6. Keep it one commit, then push:
   ```bash
   git push --force-with-lease origin <branch>
   ```
7. Refresh the fork's mirror branch, so the fork PR shows only its own diff:
   ```bash
   git push --force-with-lease origin upstream/main:refs/heads/upstream-main
   ```
8. In the PR description, delete the sentence saying it touches the same file as the other PR, which is merged now. Don't change anything else in the description.

## Report back

Report:
- which branch you rebased;
- the new head SHA;
- whether the only conflict was the one above, or what else you found;
- the results of the checks, in words.
