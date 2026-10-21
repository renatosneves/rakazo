export type AndroidActionSheetAction = {
  text: string;
  destructive?: boolean;
  onPress: () => void;
};

export type AndroidActionSheetRequest = {
  title?: string;
  cancel: string;
  actions: AndroidActionSheetAction[];
};

let current: AndroidActionSheetRequest | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Present a bounded Material-style sheet without paging through an Alert. */
export function presentAndroidActionSheet(request: AndroidActionSheetRequest): void {
  current = request;
  emit();
}

export function dismissAndroidActionSheet(): void {
  if (!current) return;
  current = null;
  emit();
}

export function getAndroidActionSheet(): AndroidActionSheetRequest | null {
  return current;
}

export function subscribeAndroidActionSheet(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
