# Follow-up fixes for PRs #5, #8, #9, #10, #11, #12 (instructions for OpenCode)

The orchestrator re-checked all ten PRs after the first round. All ten pass: author, base, unstacking, lint, type check and the mobile tests. The items below are what's left. The ground rules, author identity and push rules from `plans/opencode-fix-plan.md` still apply. Keep each PR as a single commit: amend it, or fix it up and squash.

## Step A: install your standing rules (once, before anything else)

Your standing rules live in `plans/opencode-worker-rules.md` on the fork branch `claude/project-thread-da55l3`. Load them in every session for this repo **without committing anything to a PR branch**:

1. In your local clone's root, create `opencode.json` (or add to the existing one) with:
   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "instructions": [
       "https://raw.githubusercontent.com/renatosneves/rakazo/claude/project-thread-da55l3/plans/opencode-worker-rules.md"
     ]
   }
   ```
2. Keep the file local only: add `opencode.json` to `.git/info/exclude` (not `.gitignore`, which is tracked).
3. Confirm that `git status` doesn't list `opencode.json`. Then restart OpenCode in the repo and confirm that the rules appear in your context.

The repository's own `AGENTS.md` still loads, and the rules file is added to it. Never edit the repo's `AGENTS.md` in a PR branch: it's the upstream maintainer's file, and changes there would leak into upstream PRs.

## 0. Encoding (do this first; it's the cause of the #10 blocker)

Your editor or shell is writing files with a UTF-8 BOM, and in one case re-encoded UTF-8 as Windows-1252 (mojibake).
- Write every file as **UTF-8 without BOM**.
- Don't round-trip file contents through PowerShell `Get-Content`/`Set-Content` or `Out-File`.

Before every push, run these two checks. Both must print nothing:

```bash
# BOMs anywhere in the PR's added lines
git diff upstream/main -- . | grep -n $'^+\xEF\xBB\xBF'
# Mojibake markers in added lines
git diff upstream/main -- . | grep -nP '^\+.*(Ã.|â€|â†|î€)'
```

## #10 BLOCKER: the Kotlin file no longer compiles

In `apps/mobile/modules/rakazo-notifications/android/src/main/java/com/rakazo/notifications/RakazoNotificationService.kt`, two lines were corrupted by re-encoding. The first is a compile error: "Too many characters in a character literal", confirmed by the orchestrator.

1. Replace the corrupted `PAYLOAD_MARK` line with an escape, so it can't be corrupted again:
   `private const val PAYLOAD_MARK = ''`
2. Restore the KDoc line above `markdownToPreview` to read `Reply Markdown → a single notification line…` (the arrow is U+2192), exactly as on upstream.
3. Remove the extra blank line this PR added at the end of the file.
4. Then confirm the file differs from upstream only in your intended changes:
   `git diff upstream/main -- <that file>` must show no other non-ASCII changes.

Also in #10:
5. `requestPushPermission()` in `apps/mobile/lib/push.ts` is now unused, because the Account row opens system settings. Delete it and its test cases in `lib/push.test.ts`.
6. Remove the stray empty line this PR added to the import block in `apps/mobile/app/(settings)/account.tsx`, between the `live-notifications` and `native` imports.
7. **Dutch is missing.** The app ships `nl` (see `UI_LOCALES` in `lib/ui-locale.ts`). Add `res/values-nl/strings.xml` with every key from `values/strings.xml`, translated into Dutch, keeping the `%1$s`/`%2$d` arguments. Extend `lib/android-notification-resources.test.ts` so it checks every locale in `UI_LOCALES`, which would have caught this.

## #12 Calls with the screen off

1. Add `res/values-nl/call_strings.xml`, with Dutch for `rakazo_call_channel`, `rakazo_call_title` and `rakazo_call_text`. Make the resource test cover every `UI_LOCALES` entry.
2. Remove the BOM from `apps/mobile/lib/call-background.test.ts`.

## #5 Inbox polling

1. Remove the BOM from `apps/mobile/lib/poll-cadence.ts`.
2. Restore the stale-response guard for Activity. The old loop incremented `activityRequestId` whenever the activity loop stopped (mode switched off, session lost), so a late response couldn't overwrite state. Now it only happens on unmount. Replace the unmount-only effect with:
   ```ts
   useEffect(() => () => { activityRequestId.current += 1; }, [activityMode, hasSession]);
   ```

## #8 Photo upload size

1. Remove the BOM from `apps/mobile/lib/pick-attachments-image.test.ts`.

## #9 Ripple

1. In `components/glass-icon-button.tsx`, the added `borderRadius: size / 2` and `overflow: "hidden"` also apply on iOS, but the PR says iOS is unchanged. Apply them only on Android: `...(Platform.OS === "android" ? { borderRadius: size / 2, overflow: "hidden" } : null)`.

## #11 Error boundary

`lib/observability.ts` now has no real reporter. `setErrorReporter` has no caller, and the global handler only logs in development, which React Native already does. That makes it an unused abstraction (AGENTS.md: "avoid speculative abstractions").

1. Delete `lib/observability.ts` and `lib/observability.test.ts`, and remove `installGlobalErrorHandler()` from `app/_layout.tsx`.
2. Remove `componentDidCatch` from `AppErrorBoundary` (React Native already logs the error in development). Keep `getDerivedStateFromError` and the retry.
3. Keep `lib/app-error-boundary.test.tsx`.
4. Update the PR description so it no longer mentions the reporter or the global handler.

## Not needed

#4, #6, #7 and #13 need no further changes.

The fork branch `fix/native-action-sheets` holds the old custom action sheet, with no PR. Leave it alone; don't open a PR for it.

## Report back

For each PR you touched: the new head SHA, the author check (`git log --format='%an <%ae>' upstream/main..HEAD`), the two encoding checks printing nothing, and lint, type check and mobile tests passing, in words.
