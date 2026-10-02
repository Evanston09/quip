import { useState } from "react";
import { Action, Label, Muted, Screen } from "@/components/coach-ui";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/state/auth";
import { usePractice } from "@/state/practice";

export default function Account() {
  const { session, signOut } = useAuth();
  const { recording } = usePractice();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Screen title="Account">
      <Label>Email</Label>
      <Text selectable>{session?.user.email}</Text>
      <Muted>
        Your practice history is saved on this device for this account.
      </Muted>
      {recording && <Muted>Finish your recording before signing out.</Muted>}
      <Action
        variant="outline"
        disabled={busy || recording}
        onPress={async () => {
          setBusy(true);
          setError("");
          try {
            await signOut();
          } catch {
            setError("Couldn’t sign out. Check your connection and try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Signing out…" : "Sign out"}
      </Action>
      {!!error && (
        <Text accessibilityRole="alert" className="text-destructive">
          {error}
        </Text>
      )}
    </Screen>
  );
}
