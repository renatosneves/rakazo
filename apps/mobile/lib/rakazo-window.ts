import { requireOptionalNativeModule } from "expo-modules-core";

export type WindowPosture = { tabletop: boolean; hingeTop: number; hingeBottom: number };
export type DroppedFile = { uri: string; name: string; mimeType: string; size: number };

type Subscription = { remove(): void };
type WindowEvents = {
  onPostureChange: (posture: WindowPosture) => void;
  onFilesDropped: (event: { files: DroppedFile[] }) => void;
  onTextDropped: (event: { text: string }) => void;
};

export type NativeWindow = {
  getPosture(): WindowPosture;
  addListener<Event extends keyof WindowEvents>(
    event: Event,
    listener: WindowEvents[Event],
  ): Subscription;
};

// Android only: absent on iOS, on web, and in binaries built before the module existed.
export function nativeWindow(): NativeWindow | null {
  return requireOptionalNativeModule<NativeWindow>("RakazoWindow");
}
