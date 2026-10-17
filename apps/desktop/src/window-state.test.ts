import { describe, expect, it } from "vitest";
import { parseWindowState, restorableWindowState, serializeWindowState } from "./window-state.js";

const laptop = { x: 0, y: 0, width: 1512, height: 944 };
const external = { x: 1512, y: 0, width: 2560, height: 1415 };

describe("saved window state", () => {
  it("round-trips bounds and the maximised flag", () => {
    const state = { x: 120.4, y: 80, width: 1200, height: 800.6, maximized: true };
    expect(parseWindowState(serializeWindowState(state))).toEqual({
      x: 120,
      y: 80,
      width: 1200,
      height: 801,
      maximized: true,
    });
  });

  it("ignores unreadable or implausible files", () => {
    for (const raw of [
      "",
      "not json",
      "null",
      "[]",
      JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
      JSON.stringify({ x: "0", y: 0, width: 1200, height: 800, maximized: false }),
      JSON.stringify({ x: 0, y: 0, width: 50, height: 40, maximized: false }),
      '{"x":0,"y":0,"width":1e999,"height":800,"maximized":false}',
    ]) {
      expect(parseWindowState(raw)).toBeNull();
    }
  });
});

describe("restoring a saved window", () => {
  it("restores bounds that are still on a display", () => {
    const state = { x: 1700, y: 100, width: 1400, height: 900, maximized: false };
    expect(restorableWindowState(state, [laptop, external])).toEqual(state);
  });

  it("falls back to the default when the display it was on is gone", () => {
    const state = { x: 1700, y: 100, width: 1400, height: 900, maximized: false };
    expect(restorableWindowState(state, [laptop])).toBeNull();
  });

  it("falls back when only a sliver or the bottom of the window would be visible", () => {
    expect(
      restorableWindowState({ x: 1450, y: 100, width: 1000, height: 700, maximized: false }, [
        laptop,
      ]),
    ).toBeNull();
    expect(
      restorableWindowState({ x: 100, y: -600, width: 1000, height: 700, maximized: false }, [
        laptop,
      ]),
    ).toBeNull();
  });

  it("shrinks a window larger than the display it lands on", () => {
    expect(
      restorableWindowState({ x: 0, y: 0, width: 2400, height: 1400, maximized: true }, [laptop]),
    ).toEqual({ x: 0, y: 0, width: 1512, height: 944, maximized: true });
  });

  it("has nothing to restore without a saved state", () => {
    expect(restorableWindowState(null, [laptop])).toBeNull();
  });
});
