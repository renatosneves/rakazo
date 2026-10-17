export const WINDOW_STATE_FILE_NAME = "window-state.json";

export type Rectangle = { x: number; y: number; width: number; height: number };
export type WindowState = Rectangle & { maximized: boolean };

const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;
/** Enough of the window must stay on a display to grab its top edge and move it back. */
const MIN_VISIBLE_WIDTH = 100;
const MIN_VISIBLE_HEIGHT = 50;

export function parseWindowState(raw: string): WindowState | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const { x, y, width, height, maximized } = value as Record<string, unknown>;
  if (![x, y, width, height].every(Number.isFinite) || typeof maximized !== "boolean") return null;
  const rect = { x, y, width, height } as Rectangle;
  if (rect.width < MIN_WIDTH || rect.height < MIN_HEIGHT) return null;
  return { ...rect, maximized };
}

export function serializeWindowState(state: WindowState): string {
  const { x, y, width, height, maximized } = state;
  return JSON.stringify({
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    maximized,
  });
}

/**
 * Saved bounds only come back while their top edge is reachable on a connected display
 * (a monitor may have been unplugged since), shrunk to fit that display's work area.
 */
export function restorableWindowState(
  state: WindowState | null,
  workAreas: readonly Rectangle[],
): WindowState | null {
  if (!state) return null;
  const titleStrip = { x: state.x, y: state.y, width: state.width, height: MIN_VISIBLE_HEIGHT };
  const area = workAreas.find((candidate) => {
    const overlap = intersection(titleStrip, candidate);
    return overlap.width >= MIN_VISIBLE_WIDTH && overlap.height >= MIN_VISIBLE_HEIGHT;
  });
  if (!area) return null;
  return {
    ...state,
    width: Math.min(state.width, area.width),
    height: Math.min(state.height, area.height),
  };
}

function intersection(a: Rectangle, b: Rectangle) {
  return {
    width: Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
    height: Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  };
}
