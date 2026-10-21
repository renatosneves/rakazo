import { useSyncExternalStore } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  dismissAndroidActionSheet,
  getAndroidActionSheet,
  subscribeAndroidActionSheet,
} from "../lib/android-action-sheet";
import { useMobileTokens } from "../lib/native";
import { androidRipple } from "../lib/ripple";

/**
 * Android action sheet. The platform Alert only supports three buttons, so long
 * message menus were split across pages. A bounded bottom sheet keeps every action
 * in one place and matches Android's own action surfaces.
 */
export function AndroidActionSheetHost() {
  const sheet = useSyncExternalStore(
    subscribeAndroidActionSheet,
    getAndroidActionSheet,
    getAndroidActionSheet,
  );
  const insets = useSafeAreaInsets();
  const tokens = useMobileTokens();
  if (!sheet) return null;
  return (
    <Modal
      animationType="fade"
      onRequestClose={dismissAndroidActionSheet}
      statusBarTranslucent
      transparent
      visible
    >
      <View style={[styles.overlay, { backgroundColor: tokens.overlay }]}>
        <Pressable
          accessibilityLabel={sheet.cancel}
          accessibilityRole="button"
          onPress={dismissAndroidActionSheet}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: tokens.card,
              borderColor: tokens.border,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          {sheet.title ? (
            <Text style={[styles.title, { color: tokens.mutedForeground }]}>{sheet.title}</Text>
          ) : null}
          <ScrollView bounces={false} style={styles.actions}>
            {sheet.actions.map((action, index) => (
              <Pressable
                accessibilityRole="button"
                android_ripple={androidRipple()}
                key={`${action.text}-${index}`}
                onPress={() => {
                  dismissAndroidActionSheet();
                  action.onPress();
                }}
                style={({ pressed }) => [
                  styles.action,
                  index > 0 && {
                    borderTopColor: tokens.border,
                    borderTopWidth: StyleSheet.hairlineWidth,
                  },
                  pressed && { backgroundColor: tokens.accent },
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    { color: action.destructive ? tokens.destructive : tokens.cardForeground },
                  ]}
                >
                  {action.text}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            android_ripple={androidRipple()}
            onPress={dismissAndroidActionSheet}
            style={({ pressed }) => [
              styles.cancel,
              { borderTopColor: tokens.border },
              pressed && { backgroundColor: tokens.accent },
            ]}
          >
            <Text style={[styles.cancelText, { color: tokens.mutedForeground }]}>
              {sheet.cancel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "78%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  title: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  actions: { flexGrow: 0 },
  action: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionText: { fontSize: 16.5 },
  cancel: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelText: { fontSize: 16, fontWeight: "600" },
});
