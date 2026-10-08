import { type MascotMotion } from "@/domain/mascot";
import { router } from "expo-router";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { usePractice } from "@/state/practice";
import { KoalaMascot } from "@/components/koala-mascot";

export function Action({
  children,
  ...props
}: Omit<ButtonProps, "children"> & { children: string }) {
  return (
    <Button
      {...props}
      className={`min-h-12 h-auto rounded-2xl px-5 py-3 ${props.className ?? ""}`}
      accessibilityLabel={children}
    >
      <Text className="shrink text-center text-base font-bold">{children}</Text>
    </Button>
  );
}
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`gap-3 rounded-2xl p-5 shadow-none ${className}`}>
      {children}
    </Card>
  );
}
export function Label({ children }: { children: ReactNode }) {
  return (
    <Text className="text-base font-semibold text-foreground">{children}</Text>
  );
}
export function Title({
  children,
  botanical = false,
}: {
  children: ReactNode;
  botanical?: boolean;
}) {
  const heading = (
    <Text
      accessibilityRole="header"
      className={`text-2xl font-bold tracking-tight ${botanical ? "pr-14" : ""}`}
    >
      {children}
    </Text>
  );
  if (!botanical) return heading;
  return (
    <View>
      <View
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: "absolute",
          right: -24,
          top: 0,
          width: 100,
          height: 140,
          overflow: "hidden",
        }}
      >
        <Image
          source={require("@/assets/illustrations/botanical-leaf.svg")}
          contentFit="contain"
          accessible={false}
          alt=""
          style={{
            position: "absolute",
            right: -8,
            top: 0,
            width: 90,
            height: 125,
            opacity: 0.55,
            transform: [{ rotate: "-18deg" }],
          }}
        />
      </View>
      {heading}
    </View>
  );
}
export function Muted({ children }: { children: ReactNode }) {
  return (
    <Text className="text-sm leading-6 text-muted-foreground">{children}</Text>
  );
}
export function Koala({
  small = false,
  motion = "idle",
}: {
  small?: boolean;
  motion?: MascotMotion;
}) {
  return <KoalaMascot size={small ? 88 : 136} motion={motion} />;
}
export function KoalaMessage({
  children,
  motion = "idle",
  small = true,
}: {
  children: string;
  motion?: MascotMotion;
  small?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-4">
      <Koala small={small} motion={motion} />
      <View className="min-h-20 flex-1 justify-center rounded-2xl border-2 border-border bg-card px-4 py-4">
        <View
          pointerEvents="none"
          className="border-border bg-card"
          style={{
            position: "absolute",
            left: -7,
            top: 28,
            width: 12,
            height: 12,
            borderLeftWidth: 2,
            borderBottomWidth: 2,
            transform: [{ rotate: "45deg" }],
          }}
        />
        <Text className="text-base font-semibold leading-6">{children}</Text>
      </View>
    </View>
  );
}
export function Screen({
  children,
  title,
  back = true,
  botanical = false,
  tabScreen = false,
}: {
  children: ReactNode;
  title?: string;
  back?: boolean;
  botanical?: boolean;
  tabScreen?: boolean;
}) {
  const { storageError, loaded, loading, loadError, reload, reset } = usePractice();
  return (
    <SafeAreaView className="flex-1 bg-background" edges={tabScreen ? ["top", "left", "right"] : ["top", "bottom", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="mx-auto w-full max-w-xl gap-5 px-6 pb-8 pt-2">
          <View className="flex-row items-center justify-between">
            {back ? (
              <Action
                variant="ghost"
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace("/")
                }
              >
                Back
              </Action>
            ) : (
              <Text className="text-lg font-extrabold">Quip</Text>
            )}
          </View>
          {storageError && (
            <Panel className="border-destructive">
              <Text className="text-destructive">{storageError}</Text>
            </Panel>
          )}
          {!loaded && loadError ? (
            <Panel>
              <Title>Let’s recover your practice</Title>
              <Text accessibilityRole="alert">{loadError}</Text>
              <Action disabled={loading} onPress={() => { void reload(); }}>
                {loading ? "Opening saved practice…" : "Try opening again"}
              </Action>
              <Confirm
                label="Reset local practice"
                confirmLabel="Reset this device"
                disabled={loading}
                message="Delete all practice recordings, feedback, preparation, your saved goal, and coaching preferences from this device? Copies already sent to AI providers are not deleted."
                onConfirm={reset}
              />
            </Panel>
          ) : !loaded ? (
            <View className="items-center gap-4 py-20">
              <ActivityIndicator color="#3D705B" />
              <Muted>Loading…</Muted>
            </View>
          ) : (
            <>
              {title && <Title botanical={botanical}>{title}</Title>}
              {children}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
export function Expand({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View className="gap-3">
      <Button
        variant="ghost"
        className="min-h-12 h-auto justify-between rounded-xl px-0 py-3"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
      >
        <Text className="shrink text-sm font-semibold">{title}</Text>
        <SymbolView
          name={{
            ios: open ? "chevron.up" : "chevron.down",
            android: open ? "expand_less" : "expand_more",
            web: open ? "expand_less" : "expand_more",
          }}
          size={18}
          tintColor="#707774"
        />
      </Button>
      {open && children}
    </View>
  );
}
export function Confirm({
  label,
  message,
  onConfirm,
  confirmLabel = "Delete from this device",
  disabled = false,
  variant = "ghost",
}: {
  label: string;
  message: string;
  onConfirm: () => Promise<void>;
  confirmLabel?: string;
  disabled?: boolean;
  variant?: ButtonProps["variant"];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const perform = async () => {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View className="gap-3">
      <Action
        variant={variant}
        disabled={busy || disabled}
        onPress={() => {
          if (Platform.OS === "web") setOpen(true);
          else
            Alert.alert(label, message, [
              { text: "Cancel", style: "cancel" },
              {
                text: confirmLabel,
                style: "destructive",
                onPress: () => {
                  void perform();
                },
              },
            ]);
        }}
      >
        {label}
      </Action>
      {open && (
        <Panel>
          <Text>{message}</Text>
          <Action
            variant="destructive"
            disabled={busy || disabled}
            onPress={() => {
              void perform();
            }}
          >
            {confirmLabel}
          </Action>
          <Action disabled={busy} variant="outline" onPress={() => setOpen(false)}>
            Cancel
          </Action>
        </Panel>
      )}
      {!!error && <Text className="text-destructive">{error}</Text>}
    </View>
  );
}
