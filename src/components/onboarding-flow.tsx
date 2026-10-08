import { Redirect, router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Action, Muted, Screen, Title } from "@/components/coach-ui";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { COMFORT, GOALS, STYLES, preferencesSchema, type Preferences } from "@/domain/preferences";
import { usePractice } from "@/state/practice";

const QUESTIONS = [
  { key: "improvementGoal", title: "What would you most like to improve?", hint: "Pick one focus for your first practice. You can choose a new goal later.", choices: GOALS },
  { key: "englishComfort", title: "How comfortable do you feel speaking English?", hint: "We’ll use this to make prompts and explanations easier to follow. It won’t change how you’re scored.", choices: COMFORT },
  { key: "feedbackStyle", title: "How do you like your feedback?", hint: "Same honest feedback. A delivery style that works for you.", choices: STYLES },
] as const;

export function OnboardingFlow() {
  const { loaded } = usePractice();
  // Mount the form only after saved answers are available.
  return loaded ? <PreferencesForm /> : <Screen back={false}>{null}</Screen>;
}

function PreferencesForm() {
  const { state, savePreferences, recording } = usePractice();
  const [answers, setAnswers] = useState<Partial<Preferences>>(state.preferences ?? {});
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState("");
  const scroll = useRef<ScrollView>(null);
  const [editing] = useState(() => !!state.onboardingCompleted);
  const question = QUESTIONS[step];
  const changeStep = (next: number) => {
    setStep(next);
    setError("");
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const save = async (skip = false) => {
    if (saving.current) return;
    const result = preferencesSchema.safeParse(answers);
    if (!skip && !result.success) {
      setError("Choose an answer to each question before saving.");
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await savePreferences(skip ? undefined : result.data);
      if (editing) router.dismissTo("/settings");
      else setFinished(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your preferences. Please try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  if (finished && state.onboardingCompleted) return <Redirect href="/" />;
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView ref={scroll} contentContainerStyle={{ flexGrow: 1 }}>
        <View className="mx-auto w-full max-w-xl flex-1 gap-8 px-6 pb-8 pt-2">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="shrink text-lg font-extrabold">Quip</Text>
            <Action variant="ghost" disabled={busy || recording} onPress={() => {
              if (editing) router.dismissTo("/settings");
              else void save(true);
            }}>{editing ? "Cancel" : "Skip"}</Action>
          </View>
          <View className="gap-3" accessibilityLabel={`Question ${step + 1} of 3`}>
            <View className="flex-row gap-2" accessible={false}>
              {QUESTIONS.map((q, i) => <View key={q.key} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />)}
            </View>
            <Muted>{`Question ${step + 1} of 3`}</Muted>
          </View>
          <View className="gap-3">
            {!editing && step === 0 && <Muted>Meet Quippy, your koala speaking coach. Let’s make practice feel like you.</Muted>}
            <Title botanical>{question.title}</Title>
            <Muted>{editing && step === 0 ? "Changing your focus updates your saved practice goal. Existing practices keep their original goal." : question.hint}</Muted>
          </View>
          <View className="gap-3" accessibilityRole="radiogroup" accessibilityLabel={question.title}>
            {Object.entries(question.choices).map(([value, choice]) => {
              const selected = answers[question.key] === value;
              return (
                <Button
                  key={value}
                  variant="outline"
                  disabled={busy || recording}
                  role="radio"
                  aria-checked={selected}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: busy || recording }}
                  accessibilityLabel={`${choice.label}. ${choice.description}`}
                  onPress={() => setAnswers((current) => ({ ...current, [question.key]: value }))}
                  className={`h-auto min-h-24 justify-between gap-4 rounded-2xl border-2 p-5 shadow-none ${selected ? "border-primary bg-secondary" : "border-border bg-card"}`}
                >
                  <View className="flex-1 gap-1">
                    <Text className="text-lg font-bold text-foreground">{choice.label}</Text>
                    <Text className="text-sm leading-5 text-foreground">{choice.description}</Text>
                  </View>
                  <SymbolView
                    name={{ ios: selected ? "checkmark.circle.fill" : "circle", android: selected ? "check_circle" : "radio_button_unchecked", web: selected ? "check_circle" : "radio_button_unchecked" }}
                    size={24}
                    tintColor={selected ? "#347553" : "#8A8F8C"}
                  />
                </Button>
              );
            })}
          </View>
          <View className="mt-auto gap-3 pt-4">
            {!!error && <Text accessibilityRole="alert" className="text-destructive">{error}</Text>}
            {recording && <Muted>Finish your recording before changing preferences.</Muted>}
            <Action disabled={busy || recording || !answers[question.key]} onPress={() => {
              if (step < QUESTIONS.length - 1) changeStep(step + 1);
              else void save();
            }}>{busy ? "Saving preferences…" : step < 2 ? "Continue" : editing ? "Save preferences" : "Start practicing"}</Action>
            {step > 0 && <Action variant="ghost" disabled={busy} onPress={() => changeStep(step - 1)}>Previous question</Action>}
            <Muted>Saved on this device. Your answers guide AI coaching when you practice. You can change them in Settings.</Muted>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
