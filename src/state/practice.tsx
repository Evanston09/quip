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
import { analyze, ApiError } from "@/services/api";
import {
  loadState,
  preserveAudio,
  removeAudio,
  saveState,
  type SavedState,
} from "@/services/storage";

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
type PracticeContext = {
  state: SavedState;
  loaded: boolean;
  storageError?: string;
  recording: boolean;
  elapsed: number;
  setSession: (session?: Session) => Promise<void>;
  start: () => Promise<void>;
  finish: (interrupted?: boolean) => Promise<string | undefined>;
  submit: (id: string) => Promise<void>;
  deleteAttempt: (id: string) => Promise<void>;
  clear: () => Promise<void>;
};
const Context = createContext<PracticeContext | null>(null);
export function PracticeProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId?: string;
}) {
  const [state, setState] = useState<SavedState>({ attempts: [] });
  const current = useRef(state);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string>();
  const [recording, setRecording] = useState(false);
  const active = useRef<SavedState["activeRecording"]>(undefined);
  const finishing = useRef(false);
  const starting = useRef(false);
  const pending = useRef(new Set<string>());
  const finishHandler = useRef<
    (interrupted?: boolean) => Promise<string | undefined>
  >(async () => undefined);
  const recorderFinished = useRef(false);
  const recorder = useAudioRecorder(
    { ...RecordingPresets.HIGH_QUALITY, directory: "document" },
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
    async (next: SavedState) => {
      if (!userId) throw new Error("Sign in to practice.");
      current.current = next;
      setState(next);
      try {
        await saveState(next, userId);
        setStorageError(undefined);
      } catch {
        const message =
          "Your device could not save practice data. Free up storage and try again.";
        setStorageError(message);
        throw new Error(message);
      }
    },
    [userId],
  );
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    loadState(userId)
      .then(async (saved) => {
        if (!alive) return;
        current.current = saved;
        setState(saved);
        await saveState(saved, userId);
        setLoaded(true);
      })
      .catch(() =>
        setStorageError(
          "Saved practice data could not be loaded. Restart the app; existing data has been kept.",
        ),
      );
    return () => {
      alive = false;
    };
  }, [userId]);
  const submit = useCallback(
    async (id: string) => {
      if (pending.current.has(id)) return;
      const attempt = current.current.attempts.find((a) => a.id === id);
      if (!attempt || attempt.status === "ready") return;
      if (attempt.retryAt && attempt.retryAt > Date.now())
        throw new Error(
          `Please wait ${Math.ceil((attempt.retryAt - Date.now()) / 1000)} seconds before retrying.`,
        );
      pending.current.add(id);
      try {
        await update({
          ...current.current,
          attempts: current.current.attempts.map((a) =>
            a.id === id ? { ...a, status: "processing", error: undefined } : a,
          ),
        });
        const previous = current.current.attempts.find(
          (a) => a.id === attempt.session.previousAttemptId,
        );
        const analysis = await analyze(attempt, previous, userId);
        if (!current.current.attempts.some((a) => a.id === id)) return;
        if (
          analysis.comparison &&
          !current.current.attempts.some(
            (a) => a.id === analysis.comparison!.previousAttemptId,
          )
        )
          delete analysis.comparison;
        await update({
          ...current.current,
          attempts: current.current.attempts.map((a) =>
            a.id === id
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
        });
      } catch (error) {
        if (current.current.attempts.some((a) => a.id === id))
          await update({
            ...current.current,
            attempts: current.current.attempts.map((a) =>
              a.id === id
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
          });
      } finally {
        pending.current.delete(id);
      }
    },
    [update, userId],
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
        await update({
          ...current.current,
          activeRecording: undefined,
          attempts: [
            attempt,
            ...current.current.attempts.filter((a) => a.id !== attempt.id),
          ],
        });
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
      await update({ ...current.current, activeRecording: r });
      recorderFinished.current = false;
      active.current = r;
      recorder.record({ forDuration: MODES[session.mode].maxSeconds });
      setRecording(true);
    } catch (error) {
      active.current = undefined;
      setRecording(false);
      await update({ ...current.current, activeRecording: undefined });
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
      await update({
        ...current.current,
        session:
          current.current.session?.previousAttemptId === id
            ? { ...current.current.session, previousAttemptId: undefined }
            : current.current.session,
        attempts: current.current.attempts
          .filter((a) => a.id !== id)
          .map((a) =>
            a.analysis?.comparison?.previousAttemptId === id
              ? { ...a, analysis: { ...a.analysis, comparison: undefined } }
              : a,
          ),
      });
      await removeAudio(attempt);
    },
    [update],
  );
  const clear = useCallback(async () => {
    if (active.current)
      throw new Error("Finish recording before deleting practice data.");
    const attempts = current.current.attempts;
    await update({ attempts: [] });
    await Promise.all(attempts.map(removeAudio));
  }, [update]);
  return (
    <Context.Provider
      value={{
        state,
        loaded,
        storageError,
        recording,
        elapsed: recorderState.durationMillis / 1000,
        setSession: (session) => update({ ...current.current, session }),
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
