import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Action, Confirm, Label, Muted, Panel, Screen } from "@/components/coach-ui";
import { RecordingPrivacy } from "@/components/recording-privacy";
import { Text } from "@/components/ui/text";
import { COMFORT, GOALS, STYLES } from "@/domain/preferences";
import { usePractice } from "@/state/practice";

export default function Settings() {
  const { state, recording, setPracticeGoal, clear } = usePractice();
  const [error, setError] = useState("");
  const [clearingGoal, setClearingGoal] = useState(false);
  const preferences = state.preferences;
  const hasPracticeData = state.attempts.length > 0 || !!state.session || !!state.practiceGoal;
  return (
    <Screen title="Settings" back={false} tabScreen>
      <Panel>
        <Label>Coaching preferences</Label>
        {preferences ? (
          <View className="gap-3">
            <View className="gap-1">
              <Muted>Practice focus</Muted>
              <Text>{GOALS[preferences.improvementGoal].label}</Text>
            </View>
            <View className="gap-1">
              <Muted>English comfort</Muted>
              <Text>{COMFORT[preferences.englishComfort].label}</Text>
            </View>
            <View className="gap-1">
              <Muted>Feedback style</Muted>
              <Text>{STYLES[preferences.feedbackStyle].label}</Text>
            </View>
          </View>
        ) : <Muted>Choose your practice focus, English comfort, and feedback style.</Muted>}
        <Action variant="outline" disabled={recording} onPress={() => router.push("/onboarding")}>
          {preferences ? "Edit coaching preferences" : "Choose coaching preferences"}
        </Action>
      </Panel>
      {state.practiceGoal && (
        <Panel>
          <Label>Your saved practice goal</Label>
          <Text>{state.practiceGoal}</Text>
          <Muted>Available for your next prompt or speech. Clearing it keeps your past feedback.</Muted>
          <Action disabled={recording || clearingGoal} variant="ghost" onPress={async () => {
            setClearingGoal(true);
            setError("");
            try { await setPracticeGoal(undefined); }
            catch (e) { setError(e instanceof Error ? e.message : "Could not clear your goal."); }
            finally { setClearingGoal(false); }
          }}>{clearingGoal ? "Clearing goal…" : "Clear saved goal"}</Action>
        </Panel>
      )}
      {!!error && <Text accessibilityRole="alert" className="text-destructive">{error}</Text>}
      {recording && <Muted>Finish your recording before changing preferences or deleting practice.</Muted>}
      <Panel>
        <Label>Privacy and local data</Label>
        <Muted>Practice history is stored on this device and does not sync across devices.</Muted>
        <RecordingPrivacy />
        {hasPracticeData && (
          <Confirm
            label="Delete all practice data"
            disabled={recording || clearingGoal}
            variant="outline"
            message="Delete every saved recording, feedback result, comparison, preparation, and saved goal from this device? Coaching preferences are kept. Copies already sent to AI providers are not deleted."
            onConfirm={clear}
          />
        )}
      </Panel>
    </Screen>
  );
}
