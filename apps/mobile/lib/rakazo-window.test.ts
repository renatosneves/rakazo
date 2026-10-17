import { requireOptionalNativeModule } from "expo-modules-core";
import { beforeEach, expect, it, vi } from "vitest";
import { addDropTarget } from "./file-drop";
import { currentPosture, FLAT_POSTURE } from "./window-posture";

vi.mock("expo-modules-core", () => ({ requireOptionalNativeModule: vi.fn() }));

type Listener = (payload: never) => void;
let listeners: Map<string, Set<Listener>>;

function emit(event: string, payload: unknown) {
  for (const listener of listeners.get(event) ?? []) listener(payload as never);
}

beforeEach(() => {
  listeners = new Map();
  vi.mocked(requireOptionalNativeModule).mockReturnValue({
    getPosture: () => ({ tabletop: true, hingeTop: 400, hingeBottom: 410 }),
    addListener: (event: string, listener: Listener) => {
      const set = listeners.get(event) ?? new Set();
      set.add(listener);
      listeners.set(event, set);
      return { remove: () => set.delete(listener) };
    },
  });
});

it("reads the posture from the native module", () => {
  expect(currentPosture()).toEqual({ tabletop: true, hingeTop: 400, hingeBottom: 410 });
  expect(requireOptionalNativeModule).toHaveBeenCalledWith("RakazoWindow");
});

it("stays flat without the native module", () => {
  vi.mocked(requireOptionalNativeModule).mockReturnValue(null);
  expect(currentPosture()).toEqual(FLAT_POSTURE);
});

it("sends drops to the most recently mounted target only", () => {
  const first = { files: vi.fn(), text: vi.fn() };
  const second = { files: vi.fn() };
  const removeFirst = addDropTarget(first);
  const removeSecond = addDropTarget(second);
  const files = [{ uri: "file:///a.png", name: "a.png", mimeType: "image/png", size: 3 }];

  emit("onFilesDropped", { files });
  expect(second.files).toHaveBeenCalledWith(files);
  expect(first.files).not.toHaveBeenCalled();

  removeSecond();
  emit("onTextDropped", { text: "hello" });
  expect(first.text).toHaveBeenCalledWith("hello");

  removeFirst();
  expect(listeners.get("onFilesDropped")?.size).toBe(0);
});
