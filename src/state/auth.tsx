import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import { supabase, supabaseUrl, supabaseKey } from "@/lib/supabase";

type AuthContext = {
  session: Session | null;
  loading: boolean;
  error?: string;
  retry: () => void;
  signOut: () => Promise<void>;
};
const Context = createContext<AuthContext | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!(supabaseUrl && supabaseKey));
  const [error, setError] = useState<string | undefined>(
    supabaseUrl && supabaseKey ? undefined : "Sign-in isn’t configured yet.",
  );
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let alive = true;
    let changes = 0;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, next) => {
      if (!alive || event === "INITIAL_SESSION") return;
      changes++;
      setSession(next?.user.email && !next.user.is_anonymous ? next : null);
      setError(undefined);
      setLoading(false);
    });
    void (async () => {
      try {
        const { data, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        let restored = data.session;
        if (restored) {
          const { data: userData, error: userError } =
            await client.auth.getUser();
          if (
            userError ||
            !userData.user?.email ||
            userData.user.is_anonymous
          ) {
            restored = null;
            if (
              userError &&
              userError.status !== 401 &&
              userError.status !== 403
            )
              throw userError;
            if (alive && changes === 0)
              await client.auth.signOut({ scope: "local" });
          }
        }
        if (alive && changes === 0) setSession(restored);
      } catch {
        if (alive && changes === 0)
          setError(
            "Couldn’t restore your sign-in. Check your connection and try again.",
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    if (Platform.OS !== "web") {
      if (AppState.currentState === "active") client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    }
    const appState = AppState.addEventListener("change", (state) => {
      if (Platform.OS === "web") return;
      if (state === "active") client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
      appState.remove();
      if (Platform.OS !== "web") client.auth.stopAutoRefresh();
    };
  }, [retryCount]);
  return (
    <Context.Provider
      value={{
        session,
        loading,
        error,
        retry: () => {
          setLoading(true);
          setError(undefined);
          setRetryCount((n) => n + 1);
        },
        signOut: async () => {
          if (!supabase) return;
          const { error } = await supabase.auth.signOut({ scope: "local" });
          if (error) throw error;
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing auth provider");
  return context;
}
