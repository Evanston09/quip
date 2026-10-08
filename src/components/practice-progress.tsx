import { useState } from "react";
import { View } from "react-native";
import { LineChart, type lineDataItem } from "react-native-gifted-charts";
import { useReducedMotion } from "react-native-reanimated";
import { Action, Label, Muted, Panel } from "@/components/coach-ui";
import { Text } from "@/components/ui/text";
import { MODES, type Attempt, type Mode } from "@/domain/practice";
import { practiceProgress } from "@/domain/progress";

const CONTENT = "#347553";
const DELIVERY = "#526CAA";
const date = (timestamp: number) => new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const change = (value: number) => `${value > 0 ? "+" : ""}${value} pts`;

export function PracticeProgress({ attempts, onOpen }: { attempts: Attempt[]; onOpen: (id: string) => void }) {
  const [chosenMode, setMode] = useState<Mode>();
  const latest = attempts.reduce<Attempt | undefined>((last, attempt) =>
    attempt.status === "ready" && attempt.analysis && (!last || attempt.createdAt > last.createdAt) ? attempt : last,
  undefined);
  const mode = chosenMode ?? latest?.session.mode ?? "interview";
  return (
    <View className="gap-3">
      <View className="gap-1">
        <Label>Your progress</Label>
        <Muted>Small steps, seen over time.</Muted>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {(Object.keys(MODES) as Mode[]).map((item) => (
          <Action key={item} variant={mode === item ? "default" : "outline"}
            accessibilityState={{ selected: mode === item }} onPress={() => setMode(item)}>
            {MODES[item].label}
          </Action>
        ))}
      </View>
      <ProgressChart key={mode} attempts={attempts} mode={mode} onOpen={onOpen} />
    </View>
  );
}

function ProgressChart({ attempts, mode, onOpen }: { attempts: Attempt[]; mode: Mode; onOpen: (id: string) => void }) {
  const { points, total } = practiceProgress(attempts, mode);
  const [width, setWidth] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const reducedMotion = useReducedMotion();
  const selectedIndex = Math.max(0, selectedId ? points.findIndex((point) => point.id === selectedId) : points.length - 1);
  const selected = points[selectedIndex];
  const first = points[0];
  const latest = points[points.length - 1];
  const data = (metric: "content" | "delivery"): lineDataItem[] => points.map((point) => ({
    value: point[metric], label: date(point.createdAt),
    onPress: () => onOpen(point.id),
  }));
  return (
    <Panel>
      {!latest ? (
        <View className="gap-2 py-6">
          <Text className="text-lg font-bold">Your next practice starts the line.</Text>
          <Muted>Complete a {MODES[mode].label.toLowerCase()} practice to see content and delivery scores here.</Muted>
        </View>
      ) : (
        <>
          <View className="flex-row items-center justify-between">
            <Label>{MODES[mode].label} scores</Label>
            <Text className="text-xs text-muted-foreground">OUT OF 100</Text>
          </View>
          <Muted>Latest attempt · {date(latest.createdAt)}</Muted>
          <View className="flex-row gap-3">
            {(["content", "delivery"] as const).map((metric) => (
              <View key={metric} className="flex-1 gap-1 rounded-xl bg-secondary p-3">
                <View className="flex-row items-center gap-2">
                  <View style={{ backgroundColor: metric === "content" ? CONTENT : DELIVERY, width: 8, height: 8, borderRadius: metric === "content" ? 4 : 1 }} />
                  <Text className="text-sm font-semibold">{metric === "content" ? "Content" : "Delivery"}</Text>
                </View>
                <Text className="text-3xl font-extrabold" style={{ color: metric === "content" ? CONTENT : DELIVERY }}>{latest[metric]}</Text>
                <Text className="text-xs text-muted-foreground">{points.length > 1 ? `${change(latest[metric] - first[metric])} since ${date(first.createdAt)}` : "First completed attempt"}</Text>
              </View>
            ))}
          </View>
          <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
            style={{ minHeight: 230, paddingTop: 12 }}>
            {width > 0 && (
              <LineChart
                data={data("content")} data2={data("delivery")}
                width={Math.max(100, width - 42)} height={170}
                maxValue={100} noOfSections={4} stepValue={25}
                spacing={Math.max(64, (width - 88) / Math.max(1, points.length - 1))}
                initialSpacing={22} endSpacing={22}
                color1={CONTENT} color2={DELIVERY} thickness={3}
                dataPointsColor1={CONTENT} dataPointsColor2={DELIVERY}
                dataPointsRadius={5} dataPointsShape2="rectangular"
                dataPointsWidth2={8} dataPointsHeight2={8} strokeDashArray2={[6, 4]}
                areaChart1 startFillColor1={CONTENT} endFillColor1={CONTENT}
                startOpacity1={0.14} endOpacity1={0.01}
                yAxisThickness={0} xAxisThickness={1} xAxisColor="#DCE4DF"
                rulesColor="#E7EDE9" rulesType="solid"
                yAxisLabelWidth={30} yAxisTextStyle={{ color: "#707774", fontSize: 11, fontFamily: "Nunito_500Medium" }}
                xAxisLabelTextStyle={{ color: "#707774", fontSize: 11, fontFamily: "Nunito_500Medium" }}
                xAxisLabelsHeight={28} scrollToEnd showScrollIndicator
                isAnimated={!reducedMotion} animateTogether animationDuration={350}
                renderDataPointsAfterAnimationEnds
              />
            )}
          </View>
          <Muted>
            {points.length === 1 ? "One real attempt. Keep practicing to build a trend." : `${total > points.length ? `Latest ${points.length} of ${total} attempts. ` : ""}Each point is an attempt, equally spaced in date order. Tap a point for feedback${points.length > 4 ? "; swipe to explore" : ""}.`}
          </Muted>
          {selected && (
            <View className="gap-3 border-t border-border pt-3">
              <Text accessibilityLiveRegion="polite" className="text-sm font-semibold">
                {new Date(selected.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                {selected.difficulty ? ` · ${selected.difficulty}` : ""}{"\n"}
                Content {selected.content}/100 · Delivery {selected.delivery}/100
              </Text>
              {points.length > 1 && (
                <View className="flex-row gap-2">
                  <Action className="flex-1" variant="outline" disabled={selectedIndex === 0}
                    onPress={() => setSelectedId(points[selectedIndex - 1].id)}>Earlier</Action>
                  <Action className="flex-1" variant="outline" disabled={selectedIndex === points.length - 1}
                    onPress={() => setSelectedId(points[selectedIndex + 1].id)}>Later</Action>
                </View>
              )}
              <Action variant="outline" onPress={() => onOpen(selected.id)}>Open this feedback</Action>
            </View>
          )}
          <Muted>Different prompts and difficulties can affect scores. Retry the same prompt for a closer comparison.</Muted>
        </>
      )}
    </Panel>
  );
}
