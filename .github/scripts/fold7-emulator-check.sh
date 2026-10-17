#!/usr/bin/env bash
# Runs the split-view flow on an emulator sized like the Galaxy Z Fold 7's inner screen, then
# folds it to a phone-sized screen and captures that too.
set -euo pipefail
report_dir="test-report/mobile-screenshots"
mkdir -p "$report_dir"
# Galaxy Z Fold 7 inner display: 1968x2184 at about 420 dpi, about 750dp wide.
adb shell wm size 1968x2184
adb shell wm density 420
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk
adb logcat -c
adb logcat > "$RUNNER_TEMP/android.log" &
log_pid=$!
trap 'kill $log_pid 2>/dev/null || true; cp "$RUNNER_TEMP/android.log" "$report_dir/" || true' EXIT
MOBILE_FLOWS=fold-split timeout --signal=INT --kill-after=30s 15m pnpm test:mobile-screenshots || status=$?
# Folded: a phone-sized screen keeps the single list, as before.
adb shell wm size 1080x2520
adb shell wm density 420
sleep 4
mkdir -p "$report_dir"
adb exec-out screencap -p > "$report_dir/fold-08-folded.png"
adb shell wm size reset
adb shell wm density reset
exit "${status:-0}"
