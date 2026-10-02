import AsyncStorage from "@react-native-async-storage/async-storage";
import { File } from "expo-file-system";
import { Platform } from "react-native";
import type { Attempt, Session } from "@/domain/practice";

const KEY = "speaking-coach:v1";
export type SavedState = {
  attempts: Attempt[];
  session?: Session;
  activeRecording?: {
    id: string;
    session: Session;
    uri: string;
    startedAt: number;
  };
};
let writes = Promise.resolve();
export async function loadState(userId: string): Promise<SavedState> {
  const raw = await AsyncStorage.getItem(`${KEY}:${userId}`);
  if (!raw) return { attempts: [] };
  const state = JSON.parse(raw) as SavedState;
  if (!Array.isArray(state.attempts))
    throw new Error("Saved practice data could not be read.");
  state.attempts = await Promise.all(
    state.attempts.map(async (a) => ({
      ...a,
      status: a.status === "processing" ? "needs-retry" : a.status,
      ...(Platform.OS === "web" ? { uri: await webAudioUrl(a.id) } : {}),
    })),
  );
  if (state.activeRecording && Platform.OS !== "web") {
    const r = state.activeRecording;
    if (
      r.uri &&
      new File(r.uri).exists &&
      !state.attempts.some((a) => a.id === r.id)
    )
      state.attempts.unshift({
        id: r.id,
        session: r.session,
        uri: r.uri,
        mimeType: "audio/mp4",
        createdAt: r.startedAt,
        durationSeconds: 0,
        durationUnknown: true,
        status: "interrupted",
      });
  }
  delete state.activeRecording;
  return state;
}
export function saveState(state: SavedState, userId: string) {
  const serialized = JSON.stringify(state);
  const next = writes
    .catch(() => {})
    .then(() => AsyncStorage.setItem(`${KEY}:${userId}`, serialized));
  writes = next;
  return next;
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("speaking-coach-audio", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("audio");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function webOperation<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("audio", mode);
    const request = operation(transaction.objectStore("audio"));
    transaction.oncomplete = () => {
      resolve(request.result);
      db.close();
    };
    transaction.onerror = () => {
      reject(transaction.error);
      db.close();
    };
    transaction.onabort = () => {
      reject(transaction.error);
      db.close();
    };
  });
}
async function webAudioUrl(id: string) {
  const blob = await webOperation<Blob | undefined>("readonly", (store) =>
    store.get(id),
  );
  return blob ? URL.createObjectURL(blob) : "";
}
export async function preserveAudio(id: string, uri: string) {
  if (Platform.OS !== "web") {
    if (!new File(uri).exists)
      throw new Error("The recording file is unavailable.");
    return uri;
  }
  const response = await fetch(uri);
  const blob = await response.blob();
  await webOperation("readwrite", (store) => store.put(blob, id));
  return URL.createObjectURL(blob);
}
export async function removeAudio(attempt: Attempt) {
  if (Platform.OS === "web") {
    await webOperation("readwrite", (store) => store.delete(attempt.id));
    if (attempt.uri) URL.revokeObjectURL(attempt.uri);
  } else if (attempt.uri) {
    const file = new File(attempt.uri);
    if (file.exists) file.delete();
  }
}
