import { ActionSheetIOS, Platform } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { presentAndroidActionSheet } from "./android-action-sheet";
import { presentMessageActionSheet } from "./message-action-sheet";

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  ActionSheetIOS: { showActionSheetWithOptions: vi.fn() },
}));
vi.mock("./android-action-sheet", () => ({ presentAndroidActionSheet: vi.fn() }));

function sheet() {
  const actions = ["Reply", "React", "Speak", "Copy"].map((text) => ({ text, onPress: vi.fn() }));
  presentMessageActionSheet({
    actions,
    title: "12:34",
    cancel: "Cancel",
    more: "More",
    colorScheme: "light",
  });
  return actions;
}

describe("native message action sheet", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves every iOS action, timestamp, appearance and cancellation", () => {
    Platform.OS = "ios";
    const actions = sheet();
    const [options, select] = vi.mocked(ActionSheetIOS.showActionSheetWithOptions).mock.calls[0]!;
    expect(options).toEqual({
      options: ["Reply", "React", "Speak", "Copy", "Cancel"],
      cancelButtonIndex: 4,
      title: "12:34",
      userInterfaceStyle: "light",
    });
    select(4);
    expect(actions.every((action) => action.onPress.mock.calls.length === 0)).toBe(true);
    for (let index = 0; index < actions.length; index++) {
      select(index);
      expect(actions[index]!.onPress).toHaveBeenCalledOnce();
    }
  });

  it("keeps every Android action in one sheet instead of paging an Alert", () => {
    Platform.OS = "android";
    const actions = sheet();
    const request = vi.mocked(presentAndroidActionSheet).mock.calls[0]?.[0];
    expect(request?.title).toBe("12:34");
    expect(request?.cancel).toBe("Cancel");
    expect(request?.actions.map((action) => action.text)).toEqual([
      "Reply",
      "React",
      "Speak",
      "Copy",
    ]);
    request?.actions[0]?.onPress();
    expect(actions[0]?.onPress).toHaveBeenCalledOnce();
    expect(presentAndroidActionSheet).toHaveBeenCalledOnce();
  });
});
