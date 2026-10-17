import { describe, expect, it } from "vitest";
import { threadRefreshDelayMs } from "./refresh";

describe("thread refresh cadence", () => {
  it("polls quickly while no live subscription covers the thread", () => {
    expect(threadRefreshDelayMs("running")).toBe(750);
    expect(threadRefreshDelayMs("queued", { liveSubscribed: false })).toBe(750);
    expect(threadRefreshDelayMs("leased", { liveSubscribed: false })).toBe(750);
    expect(threadRefreshDelayMs("waiting_input")).toBe(5_000);
    expect(threadRefreshDelayMs(undefined)).toBe(5_000);
  });

  it("keeps only a slow safety poll while live events already cover the thread", () => {
    expect(threadRefreshDelayMs("running", { liveSubscribed: true })).toBe(15_000);
    expect(threadRefreshDelayMs("queued", { liveSubscribed: true })).toBe(15_000);
    expect(threadRefreshDelayMs("leased", { liveSubscribed: true })).toBe(15_000);
    expect(threadRefreshDelayMs("waiting_input", { liveSubscribed: true })).toBe(30_000);
    expect(threadRefreshDelayMs(undefined, { liveSubscribed: true })).toBe(30_000);
  });
});
