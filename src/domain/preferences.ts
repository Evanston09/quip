import { z } from "zod";
import { SPEAKING_GOALS } from "./goals.ts";

export const improvementGoalSchema = z.enum(["clarity", "fillers", "pacing", "organization"]);
export const englishComfortSchema = z.enum(["learning", "comfortable", "confident"]);
export const feedbackStyleSchema = z.enum(["encouraging", "balanced", "direct"]);
export const preferencesSchema = z.object({
  improvementGoal: improvementGoalSchema,
  englishComfort: englishComfortSchema,
  feedbackStyle: feedbackStyleSchema,
});
export const coachingPreferencesSchema = preferencesSchema.omit({ improvementGoal: true });
export type Preferences = z.infer<typeof preferencesSchema>;
export type CoachingPreferences = z.infer<typeof coachingPreferencesSchema>;

export const GOALS = {
  clarity: { label: "Clearer answers", description: "Make my main point easier to understand.", goal: SPEAKING_GOALS.clarity },
  fillers: { label: "Fewer filler words", description: "Use fewer “um,” “like,” and repeated phrases.", goal: SPEAKING_GOALS.fillers },
  pacing: { label: "Better pacing", description: "Find a steady pace with room to breathe.", goal: SPEAKING_GOALS.pacing },
  organization: { label: "Organizing my ideas", description: "Give my answers a clear beginning, middle, and end.", goal: SPEAKING_GOALS.organization },
};
export const COMFORT = {
  learning: { label: "Still learning", description: "I sometimes struggle to find the words." },
  comfortable: { label: "Fairly comfortable", description: "I can explain things, but want to sound clearer." },
  confident: { label: "Very comfortable", description: "I want to sharpen how I communicate." },
};
export const STYLES = {
  encouraging: { label: "Encouraging", description: "Lead with what worked, then help me improve." },
  balanced: { label: "Balanced", description: "Give me strengths and clear, practical corrections." },
  direct: { label: "Direct", description: "Get to the point with specific things to change." },
};

export function coachingInstructions(preferences?: CoachingPreferences): string {
  if (!preferences) return "Use balanced, respectful feedback in clear English.";
  const tone = {
    encouraging: "Use an encouraging tone. Lead with a specific strength, then explain corrections supportively. Do not hide mistakes or overpraise.",
    balanced: "Use a balanced tone. Give specific strengths alongside practical, actionable corrections.",
    direct: "Use a direct tone. Prioritize concise, specific corrections and concrete next steps. Remain respectful; never shame the speaker.",
  }[preferences.feedbackStyle];
  const language = {
    learning: "Use short sentences and everyday English in feedback. Explain unfamiliar terms with simple examples.",
    comfortable: "Use clear everyday English and concise explanations in feedback.",
    confident: "Use concise, precise feedback with nuanced explanations when useful.",
  }[preferences.englishComfort];
  return `${tone} ${language} These preferences affect feedback wording only. Apply exactly the same scoring criteria and standards regardless of comfort or feedback style.`;
}

export function promptLanguage(comfort?: Preferences["englishComfort"]): string {
  if (!comfort) return "";
  return comfort === "learning"
    ? " Phrase the question in short, everyday English; avoid unnecessary jargon. Keep the chosen subject difficulty unchanged."
    : " Phrase the question clearly in natural English. Keep the chosen subject difficulty unchanged.";
}
