import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import { useWindowDimensions } from "react-native";

/** Narrowest window that keeps the chat list beside the open chat: an unfolded foldable or a tablet. */
const SPLIT_MIN_WIDTH = 700;
const INBOX_MIN_WIDTH = 240;
const CONTENT_MIN_WIDTH = 360;
const DOCKED_CHAT_MIN_WIDTH = 300;
const INBOX_WIDTH_KEY = "rakazo.inbox-width";

export type DockedComputer = { botId: string; name: string };
type SplitState = { hidden: boolean; chosenWidth: number | null; computer: DockedComputer | null };
let state: SplitState = { hidden: false, chosenWidth: null, computer: null };
const listeners = new Set<() => void>();

function update(next: Partial<SplitState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

export function splitsWindow(windowWidth: number): boolean {
  return windowWidth >= SPLIT_MIN_WIDTH;
}

/** The list keeps the width it was dragged to, within what leaves the chat readable. */
export function inboxPaneWidth(windowWidth: number, chosenWidth: number | null = null): number {
  const preferred = chosenWidth ?? Math.min(380, Math.max(300, windowWidth / 3));
  const widest = Math.max(INBOX_MIN_WIDTH, windowWidth - CONTENT_MIN_WIDTH);
  return Math.round(Math.min(widest, Math.max(INBOX_MIN_WIDTH, preferred)));
}

/** Hides the chat list so the open chat fills a wide window, or brings it back. */
export function setInboxHidden(hidden: boolean) {
  if (state.hidden !== hidden) update({ hidden });
}

/** The computer beside its chat takes most of the window; the chat keeps a readable column. */
export function computerPaneWidth(windowWidth: number): number {
  return Math.round(
    Math.max(CONTENT_MIN_WIDTH, Math.min(windowWidth - DOCKED_CHAT_MIN_WIDTH, windowWidth * 0.58)),
  );
}

/** Shows a bot's computer beside its chat on a wide window, in place of the chat list. */
export function dockComputer(computer: DockedComputer | null) {
  if (state.computer?.botId !== computer?.botId) update({ computer });
}

export function chooseInboxWidth(width: number) {
  const chosenWidth = Math.round(width);
  update({ chosenWidth });
  void SecureStore.setItemAsync(INBOX_WIDTH_KEY, String(chosenWidth)).catch(() => undefined);
}

export async function loadInboxWidth() {
  try {
    const stored = Number(await SecureStore.getItemAsync(INBOX_WIDTH_KEY));
    if (Number.isFinite(stored) && stored > 0 && state.chosenWidth === null) {
      update({ chosenWidth: stored });
    }
  } catch {
    // Keep the default width when SecureStore is unavailable.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const currentState = () => state;

/**
 * split: the window is wide enough for the chat list and a chat side by side.
 * contentWidth: what is left for the screen beside the list.
 */
export function useSplitView() {
  const { width } = useWindowDimensions();
  const { hidden, chosenWidth, computer } = useSyncExternalStore(
    subscribe,
    currentState,
    currentState,
  );
  const split = splitsWindow(width);
  const inboxWidth = inboxPaneWidth(width, chosenWidth);
  const dockedComputer = split ? computer : null;
  const computerWidth = computerPaneWidth(width);
  const showsInbox = split && !hidden && !dockedComputer;
  return {
    split,
    inboxHidden: hidden,
    inboxWidth,
    dockedComputer,
    computerWidth,
    windowWidth: width,
    contentWidth: dockedComputer ? width - computerWidth : showsInbox ? width - inboxWidth : width,
  };
}
