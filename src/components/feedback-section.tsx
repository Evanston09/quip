import { View } from "react-native";
import { Expand, Label, Muted, Panel } from "@/components/coach-ui";
import { Text } from "@/components/ui/text";
import type { Analysis } from "@/domain/practice";
export function FeedbackSection({
  title,
  section,
}: {
  title: string;
  section: Analysis["content"];
}) {
  return (
    <Panel>
      <View className="flex-row items-center justify-between">
        <Label>{title}</Label>
        <Text className="text-2xl font-extrabold">
          {section.score}
          <Text className="text-sm text-muted-foreground"> / 100</Text>
        </Text>
      </View>
      {section.points.map((point, i) => (
        <Text key={i} className="leading-6">
          • {point}
        </Text>
      ))}
      <Expand title="Scoring & evidence">
        {section.criteria.map((c) => (
          <View key={c.name} className="gap-1 border-t border-border pt-3">
            <Text className="font-bold">
              {c.name} · {c.score}/100
            </Text>
            <Text className="leading-6">{c.explanation}</Text>
            {!!c.evidence && <Muted>{c.evidence}</Muted>}
          </View>
        ))}
      </Expand>
    </Panel>
  );
}
export function Transcript({
  text,
  phrases,
}: {
  text: string;
  phrases: string[];
}) {
  const escaped = phrases
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return <Text className="leading-7">{text}</Text>;
  const expression = new RegExp(`(\\b(?:${escaped.join("|")})\\b)`, "gi");
  const words = new Set(phrases.map((p) => p.toLowerCase()));
  return (
    <Text className="leading-7">
      {text.split(expression).map((part, i) => (
        <Text
          key={i}
          className={
            words.has(part.toLowerCase())
              ? "bg-secondary font-bold text-primary"
              : ""
          }
        >
          {part}
        </Text>
      ))}
    </Text>
  );
}
