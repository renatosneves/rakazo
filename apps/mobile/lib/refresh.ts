const ACTIVE_REFRESH_STATUSES = new Set(["queued", "leased", "running"]);

/** Full snapshot while an active run has no live subscription. */
const ACTIVE_UNSUBSCRIBED_REFRESH_MS = 750;
const IDLE_UNSUBSCRIBED_REFRESH_MS = 5_000;
/**
 * Safety polls while live events already update the thread. The stream itself
 * reconnects and takes a full snapshot when it drops or goes silent, so these
 * only bound how long a missed event can stay hidden.
 */
const ACTIVE_SUBSCRIBED_REFRESH_MS = 15_000;
const IDLE_SUBSCRIBED_REFRESH_MS = 30_000;

export function threadRefreshDelayMs(
  runStatus: string | undefined,
  options?: { liveSubscribed?: boolean },
): number {
  const active = ACTIVE_REFRESH_STATUSES.has(runStatus ?? "");
  if (options?.liveSubscribed) {
    return active ? ACTIVE_SUBSCRIBED_REFRESH_MS : IDLE_SUBSCRIBED_REFRESH_MS;
  }
  return active ? ACTIVE_UNSUBSCRIBED_REFRESH_MS : IDLE_UNSUBSCRIBED_REFRESH_MS;
}
