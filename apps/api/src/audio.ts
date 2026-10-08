import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffprobe from "ffprobe-static";
import { ServiceError } from "./provider.ts";

export const MAX_BYTES = 24 * 1024 * 1024;
const runProbe = promisify(execFile);
async function probe(args: string[]) {
  const options = { timeout: 15000, maxBuffer: 8 * 1024 * 1024 };
  try {
    return await runProbe(process.env.FFPROBE_PATH || ffprobe.path, args, options);
  } catch (error) {
    const failure = error as NodeJS.ErrnoException;
    // ffprobe-static's Darwin arm64 artifact can actually contain an Intel binary.
    // Use a locally installed native probe only when the bundled tool cannot launch.
    if (!process.env.FFPROBE_PATH && process.platform === "darwin" && process.arch === "arm64" && failure.errno === -86) {
      try {
        return await runProbe("ffprobe", args, options);
      } catch (fallbackError) {
        error = fallbackError;
      }
    }
    const launchFailure = error as NodeJS.ErrnoException;
    if (["ENOENT", "EACCES", "ENOEXEC"].includes(launchFailure.code ?? "") || launchFailure.errno === -86)
      throw new ServiceError(503, "AUDIO_TOOL_UNAVAILABLE", "The coach's audio service is unavailable. Your recording is safe; please try again later.", true);
    throw error;
  }
}
export async function inspectAudio(bytes: Uint8Array, maxSeconds: number) {
  const dir = await mkdtemp(join(tmpdir(), "speaking-"));
  try {
    const path = join(dir, "recording");
    await writeFile(path, bytes);
    const { stdout } = await probe(
      [
        "-v",
        "error",
        "-show_format",
        "-show_streams",
        "-show_packets",
        "-show_entries",
        "format=duration,format_name:stream=codec_type,duration:stream_tags=DURATION:packet=pts_time,duration_time",
        "-of",
        "json",
        path,
      ],
    );
    const info = JSON.parse(stdout) as {
      format?: { duration?: string; format_name?: string };
      packets?: { pts_time?: string; duration_time?: string }[];
      streams?: {
        codec_type?: string;
        duration?: string;
        tags?: { DURATION?: string };
      }[];
    };
    const stream = info.streams?.find((s) => s.codec_type === "audio");
    const tag = stream?.tags?.DURATION?.split(":").map(Number);
    const packetEnd = info.packets?.reduce(
      (end, p) =>
        Math.max(end, Number(p.pts_time ?? 0) + Number(p.duration_time ?? 0)),
      0,
    );
    const duration = Number(
      info.format?.duration ??
        stream?.duration ??
        (tag && tag.length === 3
          ? tag[0] * 3600 + tag[1] * 60 + tag[2]
          : (packetEnd ?? NaN)),
    );
    if (!stream || !Number.isFinite(duration) || duration < 0.5)
      throw new ServiceError(
        422,
        "UNUSABLE_AUDIO",
        "This recording is too short or its duration could not be read.",
      );
    if (duration > maxSeconds + 0.25)
      throw new ServiceError(
        413,
        "RECORDING_TOO_LONG",
        `This mode accepts recordings up to ${maxSeconds / 60} minutes.`,
      );
    const name = info.format?.format_name ?? "";
    const format = name.includes("webm")
      ? "webm"
      : name.includes("wav")
        ? "wav"
        : name.includes("mp3")
          ? "mp3"
          : name.includes("ogg")
            ? "ogg"
            : name.includes("mov")
              ? "m4a"
              : undefined;
    if (!format)
      throw new ServiceError(
        415,
        "UNSUPPORTED_AUDIO",
        "Use an M4A, WebM, WAV, MP3, or OGG recording.",
      );
    return { duration, format };
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      422,
      "UNUSABLE_AUDIO",
      "The recording could not be read. Please record again.",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
