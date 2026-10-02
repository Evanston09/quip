import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Action,
  KoalaMessage,
  Label,
  Muted,
  Title,
} from "@/components/coach-ui";
import { Text } from "@/components/ui/text";
import { supabase, supabaseKey, supabaseUrl } from "@/lib/supabase";
import { useAuth } from "@/state/auth";

export default function SignIn() {
  const { error: restoreError, retry } = useAuth();
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const passwordInput = useRef<TextInput>(null);
  const submit = async () => {
    if (submitting.current || !supabase) return;
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password || (creating && password.length < 6)) {
      setError(
        creating
          ? "Use a password with at least 6 characters."
          : "Enter your password.",
      );
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      if (creating) {
        // Avoid sending confirmation emails when the project is misconfigured.
        const settings = await fetch(`${supabaseUrl}/auth/v1/settings`, {
          headers: { apikey: supabaseKey! },
          signal: AbortSignal.timeout(15000),
        });
        if (!settings.ok)
          throw new Error("Couldn’t create your account. Please try again.");
        const config = await settings.json();
        if (!config.mailer_autoconfirm)
          throw new Error(
            "Account creation isn’t ready yet. Email confirmation needs to be turned off in Supabase.",
          );
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
        });
        if (error) throw error;
        if (!data.session)
          throw new Error(
            "Couldn’t sign you in. Try signing in with your email and password.",
          );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: address,
          password,
        });
        if (error) throw error;
      }
      setPassword("");
    } catch (e) {
      const code =
        e && typeof e === "object" && "code" in e ? e.code : undefined;
      setError(
        code === "invalid_credentials"
          ? "That email or password doesn’t match. Try again."
          : code === "email_not_confirmed"
            ? "Email confirmation is still enabled in Supabase. Turn it off to use password-only sign-in."
            : e instanceof Error
              ? e.message
              : "Couldn’t sign you in. Please try again.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View className="mx-auto w-full max-w-xl flex-1 gap-6 px-6 pb-10 pt-6">
            <Text className="text-lg font-extrabold">Speaking Coach</Text>
            <View className="flex-1 justify-center gap-6 py-8">
              <Title botanical>
                {creating ? "Create your account" : "Sign in"}
              </Title>
              <KoalaMessage wave>
                {creating ? "Hey! Nice to meet you." : "Oh, hey! Come on in."}
              </KoalaMessage>
              {!!restoreError && (
                <View className="gap-2">
                  <Text accessibilityRole="alert" className="text-destructive">
                    {restoreError}
                  </Text>
                  {supabase && (
                    <Action variant="outline" onPress={retry}>
                      Try restoring sign-in
                    </Action>
                  )}
                </View>
              )}
              <View className="gap-2">
                <Label>Email</Label>
                <TextInput
                  accessibilityLabel="Email"
                  autoComplete="email"
                  textContentType="emailAddress"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  editable={!busy}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInput.current?.focus()}
                  className="min-h-14 rounded-2xl border border-border bg-white px-4 py-3 font-sans text-base text-foreground"
                />
              </View>
              <View className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Label>Password</Label>
                  <Action
                    variant="ghost"
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide password" : "Show password"}
                  </Action>
                </View>
                <TextInput
                  ref={passwordInput}
                  accessibilityLabel="Password"
                  autoComplete={creating ? "new-password" : "current-password"}
                  textContentType={creating ? "newPassword" : "password"}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!busy}
                  returnKeyType="go"
                  onSubmitEditing={() => void submit()}
                  className="min-h-14 rounded-2xl border border-border bg-white px-4 py-3 font-sans text-base text-foreground"
                />
                {creating && <Muted>At least 6 characters.</Muted>}
              </View>
              {!!error && (
                <Text accessibilityRole="alert" className="text-destructive">
                  {error}
                </Text>
              )}
              <Action
                disabled={busy || !supabase || !email.trim() || !password}
                onPress={() => void submit()}
              >
                {busy
                  ? creating
                    ? "Creating account…"
                    : "Signing in…"
                  : creating
                    ? "Create account"
                    : "Sign in"}
              </Action>
              <Action
                variant="ghost"
                disabled={busy}
                onPress={() => {
                  setCreating(!creating);
                  setError("");
                  setPassword("");
                }}
              >
                {creating
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </Action>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
