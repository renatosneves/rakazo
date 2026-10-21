import { describe, expect, it, vi } from "vitest";

const platform = vi.hoisted(() => ({ OS: "android" }));

vi.mock("react-native", () => ({ Platform: platform }));

import { ANDROID_RIPPLE_COLOR, androidRipple } from "./ripple";

describe("android ripple", () => {
  it("adds bounded ripple feedback on Android only", () => {
    expect(androidRipple()).toEqual({ color: ANDROID_RIPPLE_COLOR });
    expect(androidRipple("#fff")).toEqual({ color: "#fff" });
    platform.OS = "ios";
    expect(androidRipple()).toBeUndefined();
  });
});
