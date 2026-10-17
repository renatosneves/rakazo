import type { MobileSnapshot } from "./api";

function equalValue(previous: unknown, next: unknown): boolean {
  if (Object.is(previous, next)) return true;
  if (!previous || !next || typeof previous !== "object" || typeof next !== "object") {
    return false;
  }
  if (Array.isArray(previous) || Array.isArray(next)) {
    return (
      Array.isArray(previous) &&
      Array.isArray(next) &&
      previous.length === next.length &&
      previous.every((value, index) => equalValue(value, next[index]))
    );
  }
  const previousRecord = previous as Record<string, unknown>;
  const nextRecord = next as Record<string, unknown>;
  const keys = Object.keys(previousRecord);
  return (
    keys.length === Object.keys(nextRecord).length &&
    keys.every(
      (key) => Object.hasOwn(nextRecord, key) && equalValue(previousRecord[key], nextRecord[key]),
    )
  );
}

/** Compare projected screen snapshots; the replay cursor stays current in snapRef. */
export function reconcileVisibleThreadSnapshot(
  previous: MobileSnapshot | null,
  next: MobileSnapshot | null,
): MobileSnapshot | null {
  if (previous === next || !previous || !next) return next;
  const { cursor: _previousCursor, ...previousVisible } = previous;
  const { cursor: _nextCursor, ...nextVisible } = next;
  if (equalValue(previousVisible, nextVisible)) return previous;
  // A polled snapshot rebuilds every message; keep unchanged ones so their memoised rows skip.
  const previousById = new Map(previous.messages.map((message) => [message.id, message]));
  let reused = false;
  const messages = next.messages.map((message) => {
    const earlier = previousById.get(message.id);
    if (!earlier || !equalValue(earlier, message)) return message;
    reused = true;
    return earlier;
  });
  return reused ? { ...next, messages } : next;
}
