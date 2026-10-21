import { Platform } from "react-native";

/** Subtle bounded ripple used by Android pressables; iOS keeps its opacity feedback. */
export const ANDROID_RIPPLE_COLOR = "rgba(128, 128, 128, 0.18)";

export function androidRipple(color = ANDROID_RIPPLE_COLOR) {
  return Platform.OS === "android" ? { color } : undefined;
}
