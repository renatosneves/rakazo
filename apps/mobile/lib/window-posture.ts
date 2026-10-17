import { useEffect, useState } from "react";
import type { WindowPosture } from "./rakazo-window";
import { nativeWindow } from "./rakazo-window";

export const FLAT_POSTURE: WindowPosture = { tabletop: false, hingeTop: 0, hingeBottom: 0 };

export function currentPosture(): WindowPosture {
  try {
    return nativeWindow()?.getPosture() ?? FLAT_POSTURE;
  } catch {
    return FLAT_POSTURE;
  }
}

/** Half-folded with a horizontal hinge, and where that hinge sits in dp from the window top. */
export function useTabletopPosture(): WindowPosture {
  const [posture, setPosture] = useState(currentPosture);
  useEffect(() => {
    const subscription = nativeWindow()?.addListener("onPostureChange", setPosture);
    setPosture(currentPosture());
    return () => subscription?.remove();
  }, []);
  return posture;
}
