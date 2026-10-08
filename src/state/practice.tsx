import { type Preferences } from "@/domain/preferences";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import { MODES, type Attempt, type Session } from "@/domain/practice";
import { completeOnboarding, replacePreparation, withoutAttempt } from "@/domain/history";
import { analyze, ApiError } from "@/services/api";
import { commitState } from "@/services/state-write";
import {
  loadState,
  preserveAudio,
  removeAudio,
  resetState,
  saveState,
  type SavedState,
} from "@/services/storage";

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
type PracticeContext = {
  state: SavedState;
  loaded: boolean;
  loading: boolean;
  loadError?: string;
  storageError?: string;
  recording: boolean;
  elapsed: number;
  metering?: number;
  setSession: (session: Session, expectedPreparationId?: string, signal?: AbortSignal) => Promise<void>;
  setPracticeGoal: (goal?: string) => Promise<void>;
  savePreferences: (preferences?: Preferences) => Promise<void>;
  reload: () => Promise<void>;
  reset: () => Promise<void>;
  start: () => Promise<void>;
  finish: (interrupted?: boolean) => Promise<string | undefined>;
  submit: (id: string) => Promise<void>;
  deleteAttempt: (id: string) => Promise<void>;
  clear: () => Promise<void>;
};
const Context = createContext<PracticeContext | null>(null);
export function PracticeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<SavedState>({ attempts: [] });
  const current = useRef(state);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [storageError, setStorageError] = useState<string>();
  const [recording, setRecording] = useState(false);
  const active = useRef<SavedState["activeRecording"]>(undefined);
  const finishing = useRef(false);
  const starting = useRef(false);
  const pending = useRef(new Set<string>());
  const mutations = useRef(Promise.resolve());
  const finishHandler = useRef<
    (interrupted?: boolean) => Promise<string | undefined>
  >(async () => undefined);
  const recorderFinished = useRef(false);
  const recorder = useAudioRecorder(
    { ...RecordingPresets.HIGH_QUALITY, directory: "document", isMeteringEnabled: true },
    (status) => {
      if (!active.current || finishing.current) return;
      if (
        status.isFinished ||
        status.hasError ||
        status.mediaServicesDidReset
      ) {
        recorderFinished.current = status.isFinished;
        const reachedCap =
          (Date.now() - active.current.startedAt) / 1000 >=
          MODES[active.current.session.mode].maxSeconds - 0.5;
        void finishHandler.current(!reachedCap).catch(() => {});
      }
    },
  );
  const recorderState = useAudioRecorderState(recorder, 200);
  const update = useCallback(
    (change: (saved: SavedState) => SavedState, signal?: AbortSignal) => {
      const task = mutations.current.catch(() => {}).then(async () => {
        if (signal?.aborted) throw new Error("Practice setup cancelled.");
        const next = change(current.current);
        try {
          await commitState(current, next, saveState, signal);
          setState(next);
          setStorageError(undefined);
        } catch (error) {
          if (signal?.aborted) throw error;
          const message = "Your device could not save practice data. Free up storage and try again.";
          setStorageError(message);
          throw new Error(message);
        }
      });
      mutations.current = task;
      return task;
    },
    [],
  );
  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    try {
      const saved = await loadState();
      await saveState(saved);
      current.current = saved;
      setState(saved);
      setStorageError(undefined);
      setLoaded(true);
    } catch {
      setLoaded(false);
      setLoadError("Your saved practice could not be opened. Your data has been kept. Try again, or reset local practice if the problem continues.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const setSession = useCallback((session: Session, expectedPreparationId?: string, signal?: AbortSignal) =>
    update((saved) => {
      if (active.current || starting.current)
        throw new Error("Finish your recording before starting another practice.");
      return replacePreparation(saved, session, expectedPreparationId);
    }, signal), [update]);
  const reset = useCallback(async () => {
    if (active.current || starting.current) throw new Error("Finish recording before resetting practice.");
    await mutations.current.catch(() => {});
    await resetState();
    current.current = { attempts: [] };
    setState(current.current);
    setLoadError(undefined);
    setStorageError(undefined);
    setLoaded(true);
  }, []);
  const submit = useCallback(
    async (id: string) => {
      if (pending.current.has(id)) return;
      const attempt = current.current.attempts.find((a) => a.id === id);
      if (!attempt || attempt.status === "ready" || attempt.status === "deleting") return;
      if (attempt.retryAt && attempt.retryAt > Date.now())
        throw new Error(
          `Please wait ${Math.ceil((attempt.retryAt - Date.now()) / 1000)} seconds before retrying.`,
        );
      pending.current.add(id);
      try {
        await update((saved) => ({
          ...saved,
          attempts: saved.attempts.map((a) =>
            a.id === id && a.status !== "deleting" && a.status !== "ready" ? { ...a, status: "processing", error: undefined } : a,
          ),
        }));
        if (current.current.attempts.find((a) => a.id === id)?.status !== "processing") return;
        const previous = current.current.attempts.find(
          (a) => a.id === attempt.session.previousAttemptId,
        );
        const analysis = await analyze(attempt, previous);
        if (current.current.attempts.find((a) => a.id === id)?.status !== "processing") return;
        await update((saved) => {
          if (analysis.comparison && !saved.attempts.some((a) => a.id === analysis.comparison!.previousAttemptId && a.status === "ready"))
            delete analysis.comparison;
          return {
            ...saved,
            attempts: saved.attempts.map((a) =>
              a.id === id && a.status === "processing"
                ? {
                    ...a,
                    durationSeconds: analysis.statistics.durationSeconds,
                    durationUnknown: false,
                    analysis,
                    status: "ready",
                    error: undefined,
                  }
                : a,
            ),
          };
        });
      } catch (error) {
        if (current.current.attempts.find((a) => a.id === id)?.status === "processing")
          await update((saved) => ({
            ...saved,
            attempts: saved.attempts.map((a) =>
              a.id === id && a.status === "processing"
                ? {
                    ...a,
                    status: "needs-retry",
                    retryable:
                      error instanceof ApiError ? error.retryable : true,
                    retryAt:
                      error instanceof ApiError ? error.retryAt : undefined,
                    error:
                      error instanceof Error
                        ? error.message
                        : "Please try again.",
                  }
                : a,
            ),
          }));
      } finally {
        pending.current.delete(id);
      }
    },
    [update],
  );
  const finish = useCallback(
    async (interrupted = false): Promise<string | undefined> => {
      const r = active.current;
      if (!r || finishing.current) return;
      finishing.current = true;
      try {
        const measuredSeconds = recorder.getStatus().durationMillis / 1000;
        const elapsedSeconds = (Date.now() - r.startedAt) / 1000;
        if (!recorderFinished.current) {
          await recorder.stop();
          recorderFinished.current = true;
        }
        const uri = recorder.uri || r.uri;
        if (!uri)
          throw new Error(
            "No recoverable audio was found. Please record again.",
          );
        const savedUri = await preserveAudio(r.id, uri);
        const durationSeconds = Math.min(
          MODES[r.session.mode].maxSeconds,
          measuredSeconds > 0 ? measuredSeconds : elapsedSeconds,
        );
        const attempt: Attempt = {
          id: r.id,
          session: r.session,
          uri: savedUri,
          mimeType: Platform.OS === "web" ? "audio/webm" : "audio/mp4",
          durationSeconds,
          createdAt: r.startedAt,
          status: interrupted ? "interrupted" : "needs-retry",
        };
        await update((saved) => ({
          ...saved,
          session: saved.session?.preparationId === r.session.preparationId ? undefined : saved.session,
          activeRecording: undefined,
          attempts: [
            attempt,
            ...saved.attempts.filter((a) => a.id !== attempt.id),
          ],
        }));
        active.current = undefined;
        setRecording(false);
        if (!interrupted)
          void submit(r.id).catch((error) => setStorageError(String(error)));
        return r.id;
      } catch (error) {
        setStorageError(
          error instanceof Error
            ? error.message
            : "Could not save the recording.",
        );
        throw error;
      } finally {
        finishing.current = false;
      }
    },
    [recorder, submit, update],
  );
  useEffect(() => {
    finishHandler.current = finish;
  }, [finish]);
  const start = useCallback(async () => {
    const session = current.current.session;
    if (!session || active.current || starting.current) return;
    starting.current = true;
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          "Microphone access is needed. Enable it in device settings to record.",
        );
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        allowsBackgroundRecording: false,
        interruptionMode: "doNotMix",
      });
      await recorder.prepareToRecordAsync();
      const r = {
        id: newId(),
        session,
        uri: recorder.uri ?? "",
        startedAt: Date.now(),
      };
      await update((saved) => {
        if (saved.session?.preparationId !== session.preparationId)
          throw new Error("Your practice changed. Return to your preparation and try again.");
        return { ...saved, activeRecording: r };
      });
      recorderFinished.current = false;
      active.current = r;
      recorder.record({ forDuration: MODES[session.mode].maxSeconds });
      setRecording(true);
    } catch (error) {
      active.current = undefined;
      setRecording(false);
      await update((saved) => ({ ...saved, activeRecording: undefined }));
      throw error;
    } finally {
      starting.current = false;
    }
  }, [recorder, update]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active" && active.current)
        void finish(true).catch(() => {});
    });
    return () => subscription.remove();
  }, [finish]);
  useEffect(() => {
    if (!recording || !active.current || finishing.current) return;
    const duration = recorderState.durationMillis / 1000;
    const limit = MODES[active.current.session.mode].maxSeconds;
    if (
      duration >= limit ||
      (Date.now() - active.current.startedAt) / 1000 >= limit
    )
      void finish().catch(() => {});
    else if (
      recorderState.mediaServicesDidReset ||
      (Platform.OS !== "web" && !recorderState.isRecording && duration > 0.3)
    )
      void finish(true).catch(() => {});
  }, [recorderState, recording, finish]);
  const deleteAttempt = useCallback(
    async (id: string) => {
      const attempt = current.current.attempts.find((a) => a.id === id);
      if (!attempt) return;
      await update((saved) => ({
        ...saved,
        attempts: saved.attempts.map((a) => a.id === id ? { ...a, status: "deleting", error: undefined } : a),
      }));
      try {
        await removeAudio(attempt);
        await update((saved) => withoutAttempt(saved, id));
      } catch {
        const message = "This recording could not be fully removed from your device. Retry deletion.";
        await update((saved) => ({
          ...saved,
          attempts: saved.attempts.map((a) => a.id === id ? { ...a, status: "deleting", error: message } : a),
        }));
        throw new Error(message);
      }
    },
    [update],
  );
  const clear = useCallback(async () => {
    if (active.current || starting.current)
      throw new Error("Finish recording before deleting practice data.");
    const attempts = current.current.attempts;
    const results = await Promise.allSettled(attempts.map((a) => deleteAttempt(a.id)));
    await update((saved) => ({ ...saved, session: undefined, practiceGoal: undefined }));
    if (results.some((result) => result.status === "rejected"))
      throw new Error("Some recordings could not be deleted. They remain in History so you can retry.");
  }, [update, deleteAttempt]);
  return (
    <Context.Provider
      value={{
        state,
        loaded,
        loading,
        loadError,
        storageError,
        recording,
        elapsed: recorderState.durationMillis / 1000,
        metering: recording && recorderState.isRecording ? recorderState.metering : undefined,
        setSession,
        setPracticeGoal: (goal) => update((saved) => ({ ...saved, practiceGoal: goal })),
        savePreferences: (preferences) => update((saved) => {
          if (active.current || starting.current) throw new Error("Finish your recording before changing coaching preferences.");
          return completeOnboarding(saved, preferences);
        }),
        reload,
        reset,
        start,
        finish,
        submit,
        deleteAttempt,
        clear,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePractice() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing practice provider");
  return value;
}
