import { useEffect, useRef } from "react";
import type { DroppedFile } from "./rakazo-window";
import { nativeWindow } from "./rakazo-window";

export type { DroppedFile };

type DropTarget = {
  files: (files: DroppedFile[]) => void;
  text?: (text: string) => void;
};

// One window, one drop target: the most recently mounted screen receives drops.
const targets: DropTarget[] = [];
let subscriptions: { remove(): void }[] = [];

function listen() {
  const native = nativeWindow();
  if (!native || subscriptions.length > 0) return;
  subscriptions = [
    native.addListener("onFilesDropped", ({ files }) => {
      if (files.length > 0) targets.at(-1)?.files(files);
    }),
    native.addListener("onTextDropped", ({ text }) => {
      if (text) targets.at(-1)?.text?.(text);
    }),
  ];
}

function stopListening() {
  for (const subscription of subscriptions) subscription.remove();
  subscriptions = [];
}

/** Registers a drop target and returns its unregister function. */
export function addDropTarget(target: DropTarget): () => void {
  targets.push(target);
  listen();
  return () => {
    const index = targets.lastIndexOf(target);
    if (index >= 0) targets.splice(index, 1);
    if (targets.length === 0) stopListening();
  };
}

/** Receives files and text dropped onto the app from another window while mounted. */
export function useFileDrop(
  handler: (files: DroppedFile[]) => void,
  onText?: (text: string) => void,
): void {
  const latest = useRef({ handler, onText });
  latest.current = { handler, onText };
  useEffect(
    () =>
      addDropTarget({
        files: (files) => latest.current.handler(files),
        text: (text) => latest.current.onText?.(text),
      }),
    [],
  );
}
