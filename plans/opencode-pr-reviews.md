# Review of OpenCode PRs #4 to #13 (fork renatosneves/rakazo)

Checked on 2026-10-21 against each PR's diff and against upstream elie222/rakazo main (188be37).

## Applies to all ten

- All ten target the fork's `main`, which is 175 commits behind upstream. Before any goes upstream it needs rebasing onto upstream `main`. Four no longer merge cleanly: #6, #7, #10 and #11.
- The commits are authored as "OpenCode <opencode@users.noreply.github.com>", not as you.
- The descriptions cite "the report's BA-01 / ST-03 / ..." findings. Upstream has no such report, so remove those references.
- #10 is stacked on #7 and #11 is stacked on #9 only because they touch the same file. Upstream prefers small independent PRs, so unstack them.
- New user-facing copy (#6, #10, #12) must be quoted in the description, with a reason it can't be removed (AGENTS.md).

| PR | What it fixes | Makes sense? | Code |
|---|---|---|---|
| #4 Thread SSE refresh | Stops re-downloading the whole chat every 1.5 s while live updates already stream in | Yes | Mostly fine; small fixes |
| #5 Inbox/activity polling | Inbox polls every 30 s instead of 5 s, and stops in background | Yes, but 30 s may be too slow | Duplicated code; needs a shared hook |
| #6 Computer polling | Stops the computer screen poll in background; removes the live mini-preview | Half | Removing the live preview is a product change and conflicts with upstream |
| #7 Notification service | Cheaper Android notification polling; safer service start | Partly superseded | Conflicts with your merged battery fix; one behaviour regression |
| #8 Image upload size | Shrinks photos before upload | Yes | Bug: resizes every image to 1600 px wide, including small ones |
| #9 Android ripple + sheet | Material press ripple; one action sheet instead of 3-button pages | Ripple yes; custom sheet no | Hardcoded colours; hand-built sheet goes against native-first |
| #10 Notification language + permission | Translates Android notifications; stops the first-launch permission prompt | Translation yes; permission change no | New users would never be asked; wrong language source |
| #11 Error boundary + Sentry | Crash screen plus Sentry crash reporting | Boundary yes; Sentry no | Sentry breaks the "no hosted vendor" rule |
| #12 Call foreground service | Keeps voice calls running with the screen off | Yes | Likely crash on the first call before mic permission |
| #13 Kotlin unit tests | First real Kotlin tests for the notification module | Yes | Correct; I ran them, 4/4 pass |

---

## #4 fix(mobile): trust thread SSE for live updates

Sensible: SSE is a thread-level subscription that already carries every message, progress and terminal event, and the stream loop refreshes on every reconnect, so a 30 s safety snapshot is enough. Merges cleanly onto upstream.

Review:
1. Use `useAppForeground()` / `isForegroundState()` from `lib/app-foreground.ts` (upstream) instead of a new `AppState` listener. Upstream deliberately pauses only on `background`, because iOS passes through `inactive` for system overlays. This PR pauses on anything other than `active`, which is inconsistent with the stream it sits next to.
2. On resume, the foreground effect already resumes the stream from its cursor. The extra immediate `tick()` adds a second full `threads/get` on every return to the app. Drop it, or skip it when the stream is live.
3. Read-only threads never subscribe to SSE, so they now update every 10 s during a run (was 750 ms) and every 60 s when idle (was 5 s). Either keep a faster cadence when `readOnly`, or say in the description that this is intended.

## #5 fix(mobile): slow inbox and activity polling

Sensible in principle: the inbox has no live stream, so polling is its only update path.

Review:
1. 30 s is a visible trade-off. In split view on foldables and tablets, the inbox sits beside the open chat, and unread state and previews for other bots would lag by up to 30 s. Consider 10–15 s for the inbox, or say why 30 s is acceptable.
2. The same pause/resume/in-flight timer appears three times (inbox, activity, and #4's thread). Extract one small hook, e.g. `useForegroundPoll(fn, intervalMs, enabled)`, built on `useAppForeground()`.
3. `poll-cadence.ts` and `poll-cadence.test.ts` start with a UTF-8 BOM. Remove it.
4. The test only re-asserts the two constants. Either test the pause/resume/in-flight behaviour (it becomes testable once it's a hook) or drop the test.

## #6 fix(mobile): pause computer polling and live preview offscreen

The background pause is good. Removing the live preview is not part of the battery fix.

Review:
1. Keep the live collapsed preview while the app is in the foreground. Watching the bot work is a feature. To save battery, unmount the `ScreenWebView` only while backgrounded (`useAppForeground()`), together with pausing the poll.
2. The new "Open computer" line under the placeholder repeats what the tappable preview already does. AGENTS.md asks for no copy that repeats the interface, so remove it.
3. Same `active` vs `background` point as #4: use `useAppForeground()`.
4. Conflicts with upstream `computer.tsx` / `computer-screen.test.tsx` (#1597, #1442). Rebase.
5. `pause()`/`resume()` in `computer-refresh.ts` look correct and the test covers them.

## #7 fix(android): reduce notification polling cost and harden lifecycle

Upstream already changed this service in 7da9930 ("reduce background battery use", merged from your earlier PR): 8 s for the first minute, then 30 s, and fast while new completions fill the recent page. This PR's fixed 20 s overrides that design and conflicts with it.

Worth keeping: the cached token, writing the seen-run set only when it changes, catching `startService` failures, and the backoff on errors.

Review:
1. Rebase onto upstream and drop the 20 s `POLL_INTERVAL_MS` change. Apply the backoff on top of upstream's fast/slow cadence.
2. `setOpenThread(null)` no longer restarts the service. When you leave a chat whose bot is still working, its live notification used to appear immediately. Now it waits for the next tick (up to 30 s on upstream's slow cadence). The original concern, background-start restrictions, is already handled by the new `runCatching` in `start()`, so keep calling `start(context, resetToken = false)` on close.
3. `start()` now always sets `ACTION_THREAD_CHANGED`, so every settings/resume start also runs `clearLive()` when a thread is open. That's harmless today, but it's a behaviour change the description doesn't mention.

## #8 fix(mobile): resize and compress picked images before upload

Sensible, but the resize is wrong.

Review:
1. `context.resize({ width: 1600 })` always runs. A 400 px image or a 1080 px phone screenshot gets upscaled to 1600 px, so the file gets larger and blurrier. Resize only when the image is bigger than the limit.
2. It resizes by width, not by longest edge, so a portrait photo becomes 1600×2133. Use `asset.width`/`asset.height` and resize the longer side (`width` when landscape, `height` when portrait).
3. Photos are compressed twice: picker `quality: 0.8`, then re-encoded at 0.7. Keep the picker at 1 and compress once in the manipulator.
4. Drop the `version`/`versionCode` bump. Upstream is already on 1.0.6, and version bumps are a release step.
5. Pin `expo-image-manipulator` exactly like the sibling Expo packages (no `~`).

## #9 feat(android): add ripple feedback and a single action sheet

Ripple: good idea. Custom sheet: goes against AGENTS.md ("native sheets, menus, alerts and pickers wherever one exists").

Review:
1. Hardcoded colours `rgba(128,128,128,0.18)` and `rgba(0,0,0,0.42)`. AGENTS.md forbids hardcoded colours, and upstream already uses `native.fillPressed` for Android ripples (`scroll-to-bottom-button-fallback.tsx`).
2. Instead of a hand-built `Modal` sheet, reuse what upstream already ships: `@expo/ui/community/menu` (`MenuView`, used in `thread-composer.tsx`) or `@expo/ui/community/bottom-sheet`. Upstream also moved message long-press to the system context menu (#1493), so `presentMessageActionSheet` now has fewer callers.
3. Ripple plus the existing `opacity: pressed` gives double feedback on Android. Drop the opacity on Android where the ripple applies.
4. Remove the now-unused `more` parameter and update its callers. Don't keep a dead option "for older clients".
5. Suggest splitting: ripple (small, easy to merge) separate from the sheet.

## #10 feat(android): localize notifications and add permission onboarding

Translating channel names and titles is good. The permission change is a regression.

Review:
1. `registerPushToken()` no longer asks for permission. On Android 13+, a new user is never asked unless they find the row in Account settings, so by default they get no reply or attention notifications. Keep the first-run request, or move it to a clear moment (e.g. after the first message is sent). Don't hide it in settings only.
2. Upstream has since reworked `push.ts` (iOS uses `requestPermissionsAsync` to avoid a blocked native queue) and the inbox notification loading (#1630, #1540). This conflicts and has to be redone on top.
3. The app has its own language picker (stored in SecureStore), but Android string resources follow the system language. A user who picks German in the app on an English phone gets English notifications. Pass the app's locale to the service, or use a per-app locale (`AppCompatDelegate.setApplicationLocales`).
4. Quote the new copy ("Enable notifications for replies and live status") and say why it's needed (AGENTS.md).
5. Unstack from #7.

## #11 feat(mobile): add an error boundary and opt-in crash reporting

The error boundary is useful. The Sentry part conflicts with AGENTS.md: "No hosted vendor is required... Vendor SDKs... belong only in adapters", and "never add provider-specific environment variables".

Review:
1. Ship the error boundary on its own, with no Sentry dependency, using the existing `reportError` seam as a no-op/dev logger. That fits the provider-neutral rule.
2. If crash reporting is wanted, it's a maintainer decision for an open-source, self-hosted app. Raise it as an issue first.
3. Technical: the dynamic `import("@sentry/react-native")` doesn't keep the SDK out of the bundle (Metro doesn't split code by default), and the native SDK is linked in every build regardless [inference]. Without the Sentry Expo config plugin there is no source-map upload, so stack traces would be minified.
4. The boundary shows "Something went wrong. Try again." plus a "Try again." button, which says the same thing twice. Keep one. The new file also starts with a BOM.
5. Unstack from #9.

## #12 feat(android): keep voice calls alive with a foreground service

Sensible: a microphone foreground service with a wake lock is the right Android mechanism.

Review:
1. **Likely crash.** `CallCard` starts the service as soon as the call state appears, but `startCall()` emits that state before the microphone permission is requested (permission is asked later, in `recordClip`). On Android 14+ (the app targets SDK 36), `startForeground(..., FOREGROUND_SERVICE_TYPE_MICROPHONE)` throws `SecurityException` without `RECORD_AUDIO`, inside `onStartCommand`, so on a first-ever call the app would crash. Start the service only after permission is granted, and wrap `startForeground` in try/catch with `stopSelf()`.
2. If the service fails to start, there's now no fallback on Android (keep-awake was removed). Keep `useKeepAwake` on Android when `startCall` rejects.
3. Google Play requires a foreground-service-type declaration for `microphone`. Mention this so the maintainer can update the Play Console.
4. Quote the new notification copy ("Ongoing call", "Rakazo call", "Microphone is active") in the description.
5. Needs a device test with the screen locked. The description already says so.

## #13 test(android): add JVM tests for endpoint and markdown logic

Correct and useful. I compiled the two tested functions on a plain JVM with the PR's test files: all 4 tests pass. The Gradle project name `:rakazo-notifications` matches the module's package name, and the CI cache key includes `apps/mobile/modules/**`, so the tests run whenever the native module changes. Only change: drop the "report's QU-01" reference.
