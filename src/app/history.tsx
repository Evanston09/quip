import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import {
  Action,
  Confirm,
  Label,
  Muted,
  Panel,
  Screen,
} from "@/components/coach-ui";
import { Text } from "@/components/ui/text";
import { MODES, type Mode } from "@/domain/practice";
import { usePractice } from "@/state/practice";
export default function History() {
  const { state, clear, recording } = usePractice();
  const [mode, setMode] = useState<Mode>("interview");
  const completed = state.attempts.filter(
    (a) => a.status === "ready" && a.analysis,
  );
  const trend = completed
    .filter((a) => a.session.mode === mode)
    .sort((a, b) => a.createdAt - b.createdAt);
  const groups = new Map<string, typeof state.attempts>();
  for (const a of state.attempts)
    groups.set(a.session.id, [...(groups.get(a.session.id) ?? []), a]);
  return (
    <Screen title="History">
      <Muted>
        {completed.length}{" "}
        {completed.length === 1 ? "completed practice" : "completed practices"}
      </Muted>
      <Label>Score trends by mode</Label>
      <View className="flex-row flex-wrap gap-2">
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <Action
            key={m}
            variant={mode === m ? "default" : "outline"}
            onPress={() => setMode(m)}
          >
            {MODES[m].label}
          </Action>
        ))}
      </View>
      <Panel>
        {trend.length === 0 ? (
          <Muted>
            Complete a {MODES[mode].label.toLowerCase()} practice to see your
            content and delivery scores here.
          </Muted>
        ) : (
          <>
            {trend.slice(-10).map((a, i) => (
              <View key={a.id} className="gap-2">
                <Text className="text-sm font-semibold">
                  {new Date(a.createdAt).toLocaleDateString()}
                  {a.session.prompt?.difficulty
                    ? ` · ${a.session.prompt.difficulty}`
                    : ""}
                </Text>
                <View className="flex-row items-center gap-2">
                  <Text className="w-16 text-xs">Content</Text>
                  <View className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <View
                      style={{ width: `${a.analysis!.content.score}%` }}
                      className="h-2 rounded-full bg-primary"
                    />
                  </View>
                  <Text className="w-8 text-sm">
                    {a.analysis!.content.score}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="w-16 text-xs">Delivery</Text>
                  <View className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <View
                      style={{
                        width: `${a.analysis!.delivery.score}%`,
                        backgroundColor: "#7995A6",
                      }}
                      className="h-2 rounded-full"
                    />
                  </View>
                  <Text className="w-8 text-sm">
                    {a.analysis!.delivery.score}
                  </Text>
                </View>
                {i !== trend.slice(-10).length - 1 && (
                  <View className="my-1 h-px bg-border" />
                )}
              </View>
            ))}
            <Muted>
              Last 10 practices. Use retries of the same prompt for direct
              comparisons.
            </Muted>
          </>
        )}
      </Panel>
      <Label>Your practice history</Label>
      {state.attempts.length === 0 && (
        <Panel>
          <Text className="text-lg font-bold">No recordings yet.</Text>
          <Muted>Your recordings and feedback will appear here.</Muted>
          <Action onPress={() => router.replace("/")}>Choose a practice</Action>
        </Panel>
      )}
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
      {!recording && (state.attempts.length > 0 || state.session || state.practiceGoal) && (
        <Confirm
          label="Delete all practice data"
          message="Delete every saved recording, feedback result, comparison, preparation, and saved goal from this device? Copies already sent to AI providers are not deleted."
          onConfirm={clear}
        />
      )}
    </Screen>
  );
}
