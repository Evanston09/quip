import type { SavedState } from "../domain/history.ts";

// Called inside the practice provider's serialized mutation queue.
export async function commitState(
  current: { current: SavedState },
  next: SavedState,
  save: (state: SavedState) => Promise<void>,
  signal?: AbortSignal,
) {
  if (signal?.aborted) throw new Error("Practice setup cancelled.");
  await save(next);
  if (signal?.aborted) {
    await save(current.current);
    throw new Error("Practice setup cancelled.");
  }
  current.current = next;
  return next;
}
