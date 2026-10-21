# Fix plan for PRs #4–#13 (instructions for OpenCode)

You are the executor. The orchestrator (Claude) has reviewed fork PRs renatosneves/rakazo #4–#13 and written the review comments on each PR. Carry out the tasks below exactly. When a task and a review comment disagree, follow this plan. Do not do anything this plan doesn't ask for.

## Ground rules (apply to every task)

1. Read `AGENTS.md` and `CONTRIBUTING.md` at the repo root before you start, and follow them. In particular:
   - Use top-level `import type`.
   - Use theme tokens only: no hardcoded colours, no `rgba(...)` literals.
   - Prefer native controls.
   - Add as little copy as possible.
   - Keep tests deterministic and offline.
   - Don't add vendor SDKs or vendor-specific env vars.
2. The repo is public. Don't commit secrets, `.env` files, local paths, hostnames or personal data.
3. Each PR stays small, focused and **independent**, based directly on upstream `main`. Don't stack PRs on each other, and don't merge one PR branch into another.
4. **Commit author: every commit must be authored and committed as Renato, never as "OpenCode".** Use exactly:
   - name: `Neves`
   - email: `48067969+renatosneves@users.noreply.github.com`
   
   Don't add `Co-Authored-By: OpenCode`, `Claude-Session:` or any other tool trailer.
5. Don't touch `apps/mobile/app.json` `version`/`versionCode`. Version bumps belong to the release process.
6. Remove BOM characters (U+FEFF) from any file you create or edit.
7. Before every push, run these from the repo root and fix every failure. Don't skip or disable tests.
   - `pnpm lint`
   - `pnpm check`
   - `pnpm --filter @rakazo/mobile test`
   
   Don't run the desktop Playwright e2e suite.
8. Force-push only the PR branches listed here, always with `--force-with-lease`. Never push to `main`.
9. If something in this plan turns out to be impossible or wrong once you see the code, stop that task. Write down what you found and move to the next task. Don't improvise a different design.

## Step 0: one-time setup

```bash
git config user.name "Neves"
git config user.email "48067969+renatosneves@users.noreply.github.com"
git remote add upstream https://github.com/elie222/rakazo.git 2>/dev/null || true
git fetch upstream main
git fetch origin
# A fork branch that mirrors upstream main, used as the base of the fork PRs
# so each PR shows only its own diff.
git push --force-with-lease origin upstream/main:refs/heads/upstream-main
pnpm install --frozen-lockfile
```

## Step 1: rebuild every branch on upstream main with the right author

For each branch, start fresh from upstream `main` and cherry-pick **only** that PR's own commits (listed below). This removes the stacking and the OpenCode author in one go. Then apply the code fixes from its task section, and run the checks.

| PR | Branch | Own commits to cherry-pick (in order) |
|---|---|---|
| #4 | `fix/thread-sse-refresh-budget` | `9e1a3f3` |
| #5 | `fix/inbox-activity-polling` | `f4fc202` |
| #6 | `fix/computer-polling-preview` | `47fcd2f` |
| #7 | `fix/android-notification-service` | `9711227` |
| #8 | `fix/image-upload-memory` | `bdec478` |
| #9 | `fix/android-interaction-polish` | `8aa3a83` |
| #10 | `fix/notification-localization` | `48a84e4` only (**not** `9711227`, which belongs to #7) |
| #11 | `fix/mobile-observability` | `baf065b`, `b9beba7` only (**not** `8aa3a83`, which belongs to #9) |
| #12 | `fix/call-background-service` | `854eea5` |
| #13 | `fix/android-native-tests` | `ca7c3df`, `ddb8342` |

Recipe (example for #4):

```bash
git checkout -B fix/thread-sse-refresh-budget upstream/main
git cherry-pick 9e1a3f3          # resolve conflicts in favour of upstream's newer code, then re-apply the PR's intent
# ...apply the task's fixes, commit them (or amend), run checks...
git rebase upstream/main --exec 'git commit --amend --no-edit --reset-author'   # guarantees the author on every commit
git log --format='%h %an <%ae> | %cn <%ce> | %s' upstream/main..HEAD   # every line must show Neves
git push --force-with-lease origin fix/thread-sse-refresh-budget
```

After you push each branch, change that fork PR's base branch from `main` to `upstream-main`, so the PR shows only its own diff.

Then rewrite the PR description:
- Use three headings: **Why** (the product reason), **What changed** and **How it was tested** (in words, no pasted tool output).
- Remove every reference to "the report" or finding IDs (BA-01, ST-03, QU-01 …).
- Remove the "Stacked on #…" notes.
- For any new user-facing text, quote it, say why it's needed, and say why it can't be removed or shown only when relevant.

Squash each PR to one or two meaningful commits. Commit messages follow `type(scope): summary`.

## Order of work

1. #13
2. #4
3. #5
4. #8
5. #6
6. #12
7. #7
8. #10
9. #9
10. #11

#7 and #10 both edit `RakazoNotificationService.kt`. Build #10 on upstream `main` anyway, and note in its description that it touches the same file as #7. Don't base one on the other.

---

## #13 test(android): JVM tests for endpoint and markdown logic

Already correct. The orchestrator ran the tests and all four pass.
- Rebuild on upstream `main` with the right author (Step 1).
- Remove the "report's QU-01 finding" and "next step is Robolectric" sentences from the description.
- No code changes.

## #4 fix(mobile): trust thread SSE for live updates

Keep the new cadence (30 s active and subscribed, 10 s active and unsubscribed, 60 s idle). Fix the following in `apps/mobile/app/thread.tsx`:

1. **Use the shared foreground hook.** Upstream already has `useAppForeground()` in `apps/mobile/lib/app-foreground.ts`, and `thread.tsx` already holds `const foreground = useAppForeground();`. Remove the new `AppState.addEventListener` and the `appActive` variable from the safety-poll effect, and use `foreground` instead:
   - Add `foreground` to the `useFocusEffect` `useCallback` deps.
   - Return early (no timer) when `!foreground`.

   This pauses only on `background`, matching upstream; iOS passes through `inactive` for system overlays.
2. **No extra refresh on resume.** When the app returns to the foreground, the existing stream effect already resumes from `liveCursor`. Don't call `tick()` immediately on resume. Just call `schedule()` so the next safety snapshot comes after the normal delay.
3. **Read-only threads.** Read-only threads (`readOnly === true`) never subscribe to SSE, so polling is their only live path. For read-only threads, keep the old cadence: 750 ms while a run is active, 5 s idle. Add a `readOnly` option to `threadRefreshDelayMs` in `apps/mobile/lib/refresh.ts`, and pass it from `thread.tsx`.
4. Tests: update `apps/mobile/lib/refresh.test.ts` to cover the `readOnly` case.

## #5 fix(mobile): slow inbox and activity polling

1. **Inbox cadence 15 s, not 30 s.** In split view on foldables and tablets, the inbox sits next to the open chat, and 30 s is visibly stale. Keep Activity at 60 s.
2. **One shared hook instead of three copies of the timer logic.** Create `apps/mobile/lib/foreground-poll.ts`, exporting a hook `useForegroundPoll(run: () => Promise<unknown>, intervalMs: number, enabled: boolean)`. It must:
   - run `run` immediately when enabled, then every `intervalMs` after the previous run **finishes** (no overlapping runs);
   - stop the timer while `useAppForeground()` is false, and run once immediately on return to the foreground;
   - clean up on unmount or when `enabled` becomes false;
   - be usable inside the focused screen. The inbox and activity loops in `apps/mobile/app/index.tsx` currently use `useFocusEffect`. Keep the focus behaviour by passing `enabled = isFocused && <existing conditions>`, using `useIsFocused()` from `@react-navigation/native` or the equivalent already used in the file.
   
   Use the hook for the inbox loop and the activity loop in `index.tsx`. Don't touch `thread.tsx` in this PR.
3. **Check the embedded split-view inbox.** `InboxPane` (rendered from `_layout.tsx` in split view) must keep polling while the chat beside it is focused. Make sure `enabled` stays true for the embedded inbox, which isn't a focused route. If you can't confirm this from the code, keep the existing focus mechanism for the embedded case and explain in the PR description.
4. Tests:
   - Delete `lib/poll-cadence.test.ts` (it only re-asserts constants).
   - Keep the constants in `lib/poll-cadence.ts` (inbox `15_000`).
   - Add `lib/foreground-poll.test.ts` using fake timers and a mocked `react-native` `AppState`. Cover: no overlapping runs, the pause in background, one immediate run on return to the foreground, and stopping when disabled.
5. Remove the BOMs.

## #8 fix(mobile): resize and compress picked images before upload

In `apps/mobile/lib/pick-attachments.ts`:

1. **Only shrink large images, by the longest edge.** Change `prepareImage` to take the asset's `width` and `height` (both available on `ImagePicker` assets).
   - If `Math.max(width, height) <= 1600`, return the original file unchanged: no resize, no re-encode.
   - Otherwise resize with `{ width: 1600 }` when `width >= height`, else `{ height: 1600 }`.
   - If width or height is missing or 0, return the original file unchanged.
2. **Compress once.** Set the picker `quality` back to `1` for both `launchImageLibraryAsync` and `launchCameraAsync`. Keep `compress: 0.7` in the manipulator save (JPEG output only; PNG stays PNG). Keep the GIF skip and the fallback to the original file on errors.
3. **Revert the `app.json` changes** (`version` and `versionCode`).
4. **Pin the dependency exactly.** In `apps/mobile/package.json`, use `"expo-image-manipulator": "57.0.21"` (no `~`), matching the other Expo packages. Regenerate `pnpm-lock.yaml` with `pnpm install`.
5. Tests in `lib/pick-attachments-image.test.ts`:
   - a 1000×800 image is not resized or re-encoded;
   - a 4000×3000 image is resized by width;
   - a 3000×4000 image is resized by height;
   - missing dimensions keep the original;
   - a GIF is untouched;
   - a manipulator failure keeps the original.

## #6 fix(mobile): pause computer polling and preview in the background

1. **Restore the live collapsed preview** in `apps/mobile/app/computer.tsx`: the `ScreenWebView` branch the PR removed. Render it only while the app is in the foreground. Use `const foreground = useAppForeground();` and add `foreground &&` to the condition that shows the collapsed `ScreenWebView`. When backgrounded, the placeholder shows instead, which unmounts the WebView and closes its stream.
2. **Remove the new "Open computer" text line** under the placeholder. The preview is already a tappable button, so the extra copy repeats the interface.
3. **Use the shared foreground hook for the poll.** Replace the `AppState.addEventListener` effect with an effect on `foreground`: `foreground ? refreshController.resume() : refreshController.pause()`. Keep `pause()`/`resume()` in `lib/computer-refresh.ts` as written, and keep their test.
4. Resolve the conflicts with upstream `computer.tsx` and `computer-screen.test.tsx` in favour of upstream's newer code, then re-apply only the changes above.
5. Tests in `lib/computer-screen.test.tsx`:
   - restore the original assertion that the view-only collapsed screen is hidden from accessibility (`data-elements-hidden`, `no-hide-descendants`);
   - add a test that the collapsed iframe isn't mounted when the app is backgrounded, by mocking `useAppForeground` to return false.

## #12 feat(android): keep voice calls alive with a foreground service

Fix the crash before anything else.

1. **Native guard (Kotlin, `RakazoCallService.kt`).** In `onStartCommand`, before `startForegroundCompat`, check `checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED`. If it isn't granted, call `stopSelf()` and return `START_NOT_STICKY` without calling `startForeground`.
   - Wrap `startForegroundCompat(title)` in `try { … } catch (e: Exception) { stopSelf(); return START_NOT_STICKY }`. This catches `SecurityException` and `ForegroundServiceStartNotAllowedException`.
   - In `RakazoCallService.start`, wrap `startForegroundService` in `runCatching`, and return whether it started. The `startCall` AsyncFunction must return a `Boolean`: `true` only when permission is granted and the start call didn't throw.
2. **Start only after microphone permission (JS).** In `apps/mobile/components/CallCard.tsx`, start the service only once microphone permission is granted. Use `AudioModule.getRecordingPermissionsAsync()` from `expo-audio` (already a dependency), and call it inside the effect, not `request…`, because `call-session.ts` already does the request. Re-check when `call.phase` changes, so the service starts right after the first-turn permission prompt is accepted. Start it once per call, and stop it when the call ends.
3. **Keep a fallback.** On Android, keep `useKeepAwake("rakazo-call")` mounted until `startCallBackground` has resolved `true`. If the service didn't start (permission missing, start refused, or no native module), the screen stays awake as before. `lib/call-background.ts` must return the boolean from native (`false` when the module is missing).
4. **Description must:**
   - quote the new notification copy ("Ongoing call", "Rakazo call", "Microphone is active") and say why it's needed: Android requires a visible notification for a foreground service;
   - say that a Google Play foreground-service declaration for the `microphone` type is needed before release;
   - say that a locked-screen device test is still required.
5. Tests:
   - extend `lib/call-service-contract.test.ts` to assert the `RECORD_AUDIO` check and the try/catch exist in the Kotlin source;
   - extend `lib/call-card-keep-awake.test.tsx` so keep-awake stays mounted on Android when `startCall` resolves `false` and unmounts when it resolves `true`.

## #7 fix(android): reduce notification polling cost and harden lifecycle

Upstream has since changed this service (commit 7da9930: 8 s polling for the first minute, then 30 s, and fast while new completions fill the recent page). Keep upstream's cadence design.

In `RakazoNotificationService.kt`:

1. **Drop the interval change.** Keep upstream's `POLL_INTERVAL_MS = 8_000L`, `SLOW_POLL_INTERVAL_MS`, `FAST_POLL_WINDOW_MS` and the `fast` logic. Apply the error backoff on top: when `failures > 0`, delay `minOf(MAX_BACKOFF_MS, SLOW_POLL_INTERVAL_MS * (1 shl failures)) + jitter`; otherwise use upstream's `fast`/slow delay.
2. **Keep these parts of the PR:**
   - `cachedToken`, reset on start with `EXTRA_RESET_TOKEN` and in `onDestroy`;
   - `persistedSeen` (write the seen set only when it changes);
   - `runCatching` + `Log.w` around `startService`;
   - `failures` counting.
3. **Restore the immediate restart when a thread closes.** In `setOpenThread`, remove the `if (botId == null && threadId == null) return` early return, and always call `start(context, resetToken = false)`. The `runCatching` in `start()` already absorbs background-start refusals. This brings back the immediate live notification when you leave a chat whose bot is still working.
4. **Don't change `start()`'s action.** Remove `.setAction(ACTION_THREAD_CHANGED)` from `start()`, so settings/resume starts keep their previous behaviour. Only `setOpenThread` uses `ACTION_THREAD_CHANGED`: give `start` an `action: String? = null` parameter and pass it from `setOpenThread`.
5. Update `lib/android-platform-contract.test.ts`:
   - remove the assertion for `if (botId == null && threadId == null) return`;
   - keep the others;
   - add assertions that `SLOW_POLL_INTERVAL_MS` and the backoff both exist.

## #10 feat(android): localise notifications and add permission onboarding

Keep the string resources and `getString(...)` changes. Fix these:

1. **Keep asking new users for permission.** Revert the change to `registerPushToken()` in `apps/mobile/lib/push.ts`. Use upstream's current version, including the iOS `notificationsAllowed()` path, so the first-run request still happens. Keep `requestPushPermission()` only as a helper for the Account row.
2. **Account row only as recovery.** In `apps/mobile/app/(settings)/account.tsx`, show the extra Notifications row only when permission is `denied`, using the existing "Android blocked notifications." copy and opening system settings. Remove the new string "Enable notifications for replies and live status" from the code and from every locale catalogue.
3. **Follow the app's language, not the phone's.** The app has its own language picker (`persistUiLocale` in `lib/i18n.ts`), so native notifications must use that locale.
   - Pass the active UI locale (`getActiveUiLocale()`) to the native module whenever live notifications are configured or resumed. Store it in `NotificationStorage` as `locale`.
   - In the service, build a localised context with `createConfigurationContext(Configuration(resources.configuration).apply { setLocale(Locale.forLanguageTag(tag)) })`, and use that context for every `getString`, including channel names.
   - When the language changes in the app, call the same configure/resume path, so the service recreates the channels with the new names.
4. **Merge on top of upstream.** Resolve the conflicts with upstream `push.ts`, `push.test.ts`, `account.tsx` and the locale files in favour of upstream, then re-apply only the changes above. This PR must not contain #7's commit.
5. Tests:
   - update `lib/push.test.ts` (first-run request still happens; the Account helper registers after a grant);
   - keep `lib/android-notification-resources.test.ts`;
   - add a contract assertion that the service uses `createConfigurationContext`.
6. In the description, quote any user-facing string you still add (ideally none) and explain the locale behaviour.

## #9 feat(android): ripple feedback (sheet removed)

Ship the ripple only. The custom action sheet goes against the native-first rule.

1. **Remove the custom sheet completely:** delete `components/android-action-sheet.tsx`, `lib/android-action-sheet.ts` and `lib/android-action-sheet.test.ts`; remove `AndroidActionSheetHost` from `_layout.tsx`; and revert `lib/message-action-sheet.ts` and its test to upstream. If a long Android action list is still a problem afterwards, raise it as a separate PR using `@expo/ui/community/menu` (`MenuView`, already used in `components/thread-composer.tsx`) or `@expo/ui/community/bottom-sheet`. **Don't do that in this PR.**
2. **Ripple colour from tokens.** Delete `ANDROID_RIPPLE_COLOR`. `androidRipple()` must use the existing `native.fillPressed` token, like `components/scroll-to-bottom-button-fallback.tsx`. Since `native` is themed, use the same access pattern that file uses, and don't hardcode a colour anywhere.
3. **No double feedback.** Where a ripple is applied (native action button, settings row, glass icon button, inbox conversation row), skip the pressed opacity/background change on Android: `pressed && Platform.OS !== "android" && …`. iOS behaviour must stay the same.
4. Retitle the PR to `feat(android): ripple press feedback`, and update the tests (`lib/ripple.test.ts`, `lib/settings-group.test.tsx`).

## #11 feat(mobile): error boundary (Sentry removed)

Ship the error boundary only. Adding Sentry breaks the AGENTS.md rule that no hosted vendor is required and that vendor SDKs live only in adapters.

1. **Remove Sentry completely:**
   - remove `@sentry/react-native` from `apps/mobile/package.json` and regenerate `pnpm-lock.yaml`;
   - delete `initObservability()` and every `EXPO_PUBLIC_SENTRY_*` reference;
   - keep `reportError`, `setErrorReporter` and `installGlobalErrorHandler` with the dev console reporter only.
2. **This PR must not contain #9's commit.** Rebuild it from upstream `main` with only the boundary and observability files and the `_layout.tsx` wrap.
3. **One message, not two.** The error screen shows "Something went wrong. Try again." **and** a "Try again." button. Change the title to an existing short catalogue string, or keep only the button with the existing copy. Don't add new strings. If no fitting existing string exists, keep "Something went wrong." only if it is already in every locale catalogue; check `lib/locales/*.ts`.
4. Remove the BOM from `components/app-error-boundary.tsx`.
5. Retitle the PR to `feat(mobile): catch render errors with an error boundary`. In the description, quote the copy shown and why it's needed: without it, a crash leaves a blank screen.
6. Tests: keep `lib/observability.test.ts`, without Sentry. Add a render test that the boundary shows the retry button after a child throws, and renders the children again after a retry.

---

## Final report (send back to the orchestrator)

For each PR, report:
- the branch, the new head SHA, and confirmation that every commit shows author `Neves <48067969+renatosneves@users.noreply.github.com>`;
- whether `pnpm lint`, `pnpm check` and the mobile tests passed, in words;
- any task you stopped on, and why;
- confirmation that the PR base is now `upstream-main` and the description has been rewritten.
