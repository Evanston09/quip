import { router } from "expo-router";
import { View } from "react-native";
import { Action, Confirm, Label, Muted, Panel } from "@/components/coach-ui";
import { MODES } from "@/domain/practice";
import { usePractice } from "@/state/practice";

export function StartPracticeAction({
  label,
  disabled = false,
  onStart,
}: {
  label: string;
  disabled?: boolean;
  onStart: (expectedPreparationId?: string) => Promise<void>;
}) {
  const { state, recording } = usePractice();
  const session = state.session;
  return session ? (
    <View className="gap-3">
      <Panel>
        <Label>You have unfinished {MODES[session.mode].label.toLowerCase()} practice</Label>
        <Muted>Resume it, or replace its saved prompt, outline, and preparation with this practice. Recorded attempts stay in History.</Muted>
        <Action variant="outline" onPress={() => router.push("/practice")}>
          Resume unfinished practice
        </Action>
      </Panel>
      <Confirm
        key={session.preparationId}
        label={label}
        variant="default"
        disabled={disabled || recording}
        confirmLabel="Replace unfinished practice"
        message="Replace your unfinished preparation? Its prompt or outline will be discarded. Saved recordings and feedback will stay."
        onConfirm={() => onStart(session.preparationId)}
      />
    </View>
  ) : (
    <Action disabled={disabled || recording} onPress={() => { void onStart(); }}>
      {label}
    </Action>
  );
}
