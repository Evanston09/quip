import { View } from "react-native";
import { Expand, Muted } from "@/components/coach-ui";
import { ExternalLink } from "@/components/external-link";
import { Text } from "@/components/ui/text";

export function RecordingPrivacy() {
  return (
    <View className="gap-2">
      <Muted>Finishing a recording sends your audio and practice context to cloud AI for feedback.</Muted>
      <Expand title="Where your practice goes">
        <Muted>
          Audio, prompts or outlines, audience, goals, coaching preferences, and previous feedback and transcripts used for comparison go through OpenRouter to the AI provider. They may retain copies under their policies.
        </Muted>
        <Muted>
          History stays on this device. Deleting practice here removes local copies; it cannot delete copies already held by AI providers.
        </Muted>
        <ExternalLink href="https://openrouter.ai/docs/guides/privacy/data-collection">
          <Text className="text-sm font-semibold text-primary underline">Read provider privacy details</Text>
        </ExternalLink>
      </Expand>
    </View>
  );
}
