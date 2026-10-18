import type { ThreadScrollState } from "@rakazo/core";

export type { ThreadScrollState } from "@rakazo/core";

export type ThreadScrollAction = "jump" | "smooth" | null;

/** The newest row: the latest message, or a send still in the outbox drawn below it. */
export function latestThreadRowKey(
  latestMessageId: string | null,
  unsentKeys: readonly string[],
): string | null {
  const unsent = unsentKeys.at(-1);
  return unsent === undefined ? latestMessageId : `${latestMessageId}:${unsent}`;
}

export class ThreadScrollBehavior {
  private threadKey: string | null = null;
  private laidOut = false;
  private contentReady = false;
  private latestRowKey: string | null = null;
  private currentState: ThreadScrollState = { detached: false, unread: false };

  openThread(threadKey: string): void {
    if (this.threadKey === threadKey) return;
    this.threadKey = threadKey;
    this.laidOut = false;
    this.contentReady = false;
    this.latestRowKey = null;
    this.currentState = { detached: false, unread: false };
  }

  onLayout(): ThreadScrollAction {
    this.laidOut = true;
    return this.contentReady && !this.currentState.detached ? "jump" : null;
  }

  onContentChanged(blocked: boolean, latestRowKey: string | null): ThreadScrollAction {
    if (blocked) return null;
    this.contentReady = true;
    if (latestRowKey === null || latestRowKey === this.latestRowKey) return null;
    const initial = this.latestRowKey === null;
    this.latestRowKey = latestRowKey;
    if (initial) return this.laidOut ? "jump" : null;
    if (this.currentState.detached) {
      this.currentState = { detached: true, unread: true };
      return null;
    }
    return "smooth";
  }

  onUserScroll(distanceFromEnd: number): ThreadScrollState {
    const detached = distanceFromEnd > 80;
    this.currentState = {
      detached,
      unread: detached ? this.currentState.unread : false,
    };
    return this.state();
  }

  jumpToLatest(): ThreadScrollAction {
    this.currentState = { detached: false, unread: false };
    return "smooth";
  }

  state(): ThreadScrollState {
    return { ...this.currentState };
  }
}
