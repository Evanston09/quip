import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import type { Attempt } from "@/domain/practice";
import { savedStateSchema } from "@/domain/history";
import type { SavedState } from "@/domain/history";
export type { SavedState } from "@/domain/history";

const KEY = "speaking-coach:v1";
let writes = Promise.resolve();
export async function loadState(): Promise<SavedState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { attempts: [] };
  const parsed = savedStateSchema.safeParse(JSON.parse(raw));
  if (!parsed.success)
    throw new Error("Saved practice data could not be read.");
  const state = parsed.data;
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
    if (state.session?.preparationId === r.session.preparationId)
      state.session = undefined;
  }
  delete state.activeRecording;
  return state;
}
export function saveState(state: SavedState) {
  const serialized = JSON.stringify(state);
  const next = writes
    .catch(() => {})
    .then(() => AsyncStorage.setItem(KEY, serialized));
  writes = next;
  return next;
}
export async function resetState() {
  // Remove the app's audio before forgetting metadata; a failure can be retried.
  if (Platform.OS === "web") {
    await webOperation("readwrite", (store) => store.clear());
  } else {
    const directory = new Directory(Paths.document, Platform.OS === "ios" ? "ExpoAudio" : "Audio");
    if (directory.exists) directory.delete();
  }
  await saveState({ attempts: [] });
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
