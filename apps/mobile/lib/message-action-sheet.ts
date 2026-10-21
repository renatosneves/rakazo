import { ActionSheetIOS, Platform } from "react-native";
import { presentAndroidActionSheet } from "./android-action-sheet";

type MessageAction = { text: string; onPress: () => void };

export function presentMessageActionSheet({
  actions,
  title,
  cancel,
  colorScheme,
}: {
  actions: MessageAction[];
  title?: string;
  cancel: string;
  /** Kept for callers on older clients; Android now uses a single sheet. */
  more?: string;
  colorScheme: "light" | "dark";
}): void {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...actions.map((action) => action.text), cancel],
        cancelButtonIndex: actions.length,
        title,
        userInterfaceStyle: colorScheme,
      },
      (index) => actions[index]?.onPress(),
    );
    return;
  }

  presentAndroidActionSheet({ title, cancel, actions });
}
