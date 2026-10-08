import { router } from "expo-router";
import { View } from "react-native";
import {
  Action,
  Label,
  Muted,
  Panel,
  Screen,
} from "@/components/coach-ui";
import { Text } from "@/components/ui/text";
import { MODES } from "@/domain/practice";
import { PracticeProgress } from "@/components/practice-progress";
import { usePractice } from "@/state/practice";
export default function History() {
  const { state } = usePractice();
  const completed = state.attempts.filter(
    (a) => a.status === "ready" && a.analysis,
  );
  const groups = new Map<string, typeof state.attempts>();
  for (const a of state.attempts)
    groups.set(a.session.id, [...(groups.get(a.session.id) ?? []), a]);
  if (state.attempts.length === 0)
    return (
      <Screen title="Previous sessions" back={false} tabScreen>
        <Panel>
          <Text className="text-lg font-bold">No recordings yet.</Text>
          <Muted>Your recordings and feedback will appear here.</Muted>
          <Action onPress={() => router.navigate("/")}>Choose a practice</Action>
        </Panel>
      </Screen>
    );
  return (
    <Screen title="Previous sessions" back={false} tabScreen>
      <Muted>
        {completed.length}{" "}
        {completed.length === 1 ? "completed practice" : "completed practices"}
      </Muted>
      <PracticeProgress
        attempts={state.attempts}
        onOpen={(id) => router.push({ pathname: "/results/[id]", params: { id } })}
      />
      <Label>Your practice history</Label>
      {[...groups.entries()].map(([id, attempts]) => (
        <Panel key={id}>
          <Label>
            {MODES[attempts[0].session.mode].label}
            {attempts[0].session.prompt?.difficulty
              ? ` · ${attempts[0].session.prompt.difficulty}`
              : ""}
          </Label>
          <Text className="font-semibold leading-6" numberOfLines={3}>
            {attempts[0].session.prompt?.text ?? attempts[0].session.outline}
          </Text>
          {attempts.map((a, index) => (
            <View key={a.id} className="gap-1">
            <Action
              variant="outline"
              onPress={() =>
                router.push({ pathname: "/results/[id]", params: { id: a.id } })
              }
            >{`Attempt ${attempts.length - index} · ${a.status === "ready" ? `${a.analysis?.overallScore}/100` : a.status === "processing" ? "Processing" : a.status === "interrupted" ? "Interrupted" : a.status === "deleting" ? "Retry deletion" : "Needs retry"}`}</Action>
            {a.session.selectedGoal && <Muted>Practiced goal: {a.session.selectedGoal}</Muted>}
            </View>
          ))}
        </Panel>
      ))}
    </Screen>
  );
}
