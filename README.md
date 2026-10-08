# Speaking Coach

A mobile-first, audio-only English speaking coach built with Expo SDK 57, Expo Router, NativeWind, and React Native Reusables. The original koala and eucalyptus palette accompany real practice; the app starts with empty history and never fabricates prompts, recordings, or feedback.

Choose **Impromptu** for scientific explanations, **Interview** for common behavioral questions, or **Rehearse** for your own outline and audience. Prepare, record, receive content and delivery feedback, choose a goal, and retry the same prompt with a comparison. History groups retries and separates score trends by mode.

Bottom tabs separate **Home**, **Previous sessions**, and **Settings**. Home focuses on choosing or continuing practice; Previous sessions contains recordings, feedback, and score trends. Settings contains coaching preferences, the saved practice goal, privacy details, and confirmed deletion of practice data. Setup, recording, feedback, and preference editing open above the tabs.

Unfinished preparation resumes through **Continue practice**, including retries with their original goal and deadline. Starting another practice asks before replacing unfinished preparation; reading old feedback never clears it. Leaving setup cancels pending prompt generation. Use **Use this goal next time** on feedback to save a goal across prompts and days; setup can omit it for one practice, and Settings can clear it.

On first launch, three optional questions choose a practice focus, English comfort, and feedback style (Encouraging, Balanced, or Direct). Skip is remembered; **Coaching preferences** in Settings lets you edit later and returns you to Settings when saved or cancelled. The focus seeds a saved goal; comfort adjusts prompt and feedback wording without changing subject difficulty; style changes coaching tone without changing scoring standards. Preferences stay on this device and are included in AI requests when relevant. Each practice snapshots its coaching preferences, so later edits do not alter pending feedback or retries.

## Run locally

Requires Node 22.13+ and pnpm. The Expo app stays at the repository root; the Hono service lives in `apps/api`.

```sh
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Set `OPENROUTER_API_KEY` in `apps/api/.env`. The default configurable model is `google/gemini-2.5-flash`. Never put the key in an `EXPO_PUBLIC_` variable.

In separate terminals:

```sh
pnpm api
pnpm start
```

For web, use `pnpm web`. For a physical phone, set `EXPO_PUBLIC_API_URL` in the root `.env` to `http://<this-computer-LAN-IP>:8787`; connect both devices to the same network and restart Expo after environment changes. Local HTTP is for development only. Public hosting and cloud history are not configured.

For the iOS Simulator, keep `pnpm api` running and run `pnpm ios` in another terminal to build and install the app. SDK 57 scene lifecycle support is enabled through `expo-build-properties` so builds using Xcode 27 can launch. If you previously built without this setting, stop Metro, run `pnpm exec expo prebuild --platform ios --clean`, then `pnpm ios`. The clean prebuild regenerates the generated `ios/` directory from app config; do not maintain native edits there. Restarting Metro alone does not update the installed native app.

## Device-only practice

Open the app and choose a practice mode; no account or sign-in is required. Recordings, feedback, and preparation are saved on this device, with no cloud history synchronization. Anyone using the same app installation or browser profile can access its history.

The local API accepts prompt and analysis requests without authentication. Only the API URL and backend OpenRouter settings are needed. Public deployment remains deferred.

`expo-audio`, `expo-asset`, `expo-file-system`, and AsyncStorage were installed using `expo install` with SDK-compatible versions. A development build is needed when your Expo Go binary does not include the installed native modules. Microphone permission is configured through the Expo audio plugin, with background recording disabled. Native directories are generated, never maintained by hand. For future dependency additions at this workspace root, pass the pnpm workspace flag through Expo: `npx expo install <package> -- -w`.

## Recording and recovery

Preparation deadlines and prompts persist across restarts. Native recordings go directly to the app document directory. Web recordings persist as Blobs in IndexedDB; metadata and feedback use AsyncStorage. Finish and the three/five-minute caps save locally before automatic analysis. Leaving the app or a recoverable audio interruption preserves audio and offers Submit or Start over. Abrupt browser termination during recording may lose an unfinished browser recording; completed audio remains durable. Native startup attempts to recover an unfinished file.

While recording, a live visualizer shows recent microphone levels using the recorder's metering on iOS, Android, and web. Silence stays flat; unavailable measurements are labeled rather than animated. Reduce Motion uses fixed level segments. Metering is temporary and does not add another microphone stream or affect feedback scores.

Analysis is a single synchronous request. Navigation can continue during processing. An unresolved request after restart becomes Needs retry. Retrying analysis updates the same attempt, so practice counts do not inflate. Deletion discards late analysis responses and removes comparisons that reference the deleted attempt.

Retries name the latest completed attempt for the same prompt or speech as their baseline, skipping interrupted, failed, and deleting attempts. Comparison uses its saved transcript, criterion evidence, filler counts, and speaking rate. Previous audio is not sent for comparison: pause placement, vocal expression, and other acoustic changes are not directly verified. Feedback links to the baseline recording so speakers can listen to both.

If local practice cannot load, **Try opening again** retries without deleting data. A separately confirmed **Reset local practice** removes this app's recordings, feedback, preparation, saved goal, and coaching preferences from the device. Failed individual or bulk audio deletions stay visible in Previous sessions with **Retry deletion**. Local deletion never removes copies already sent to AI providers; setup and Settings explain the upload and retention boundary.

## AI service

- `GET /health`: service readiness and whether a key is configured.
- `POST /v1/prompts`: JSON `mode` and scientific `difficulty`.
- `POST /v1/analyses`: multipart `audio` and `context` JSON.

Gemini receives the recording itself through OpenRouter audio-input chat and returns a verbatim transcript, detected fillers, rubric judgments, and coaching in validated structured JSON. Each applicable criterion is required. The server averages criteria, calculates the equally weighted overall score and retry differences, and derives words/minute from transcript word count and actual audio duration. There are no invented timestamps or pause measurements. Vocal and scientific assessments are AI opinions. Filler detection is accepted as an MVP assumption, not measured accuracy.

Uploads are limited to 24 MB. A bundled FFprobe validates actual audio format and duration rather than trusting client claims, including packet timing when browser WebM duration metadata is absent. Accepted containers: M4A, WebM, WAV, MP3, OGG. Temporary audio is removed after validation; the service does not maintain a database or durable audio storage. Provider format support can still vary and is surfaced as a retryable analysis failure.

If the bundled FFprobe cannot run on Apple Silicon, the API falls back to `ffprobe` on PATH (install with `brew install ffmpeg`). You can also set `FFPROBE_PATH` in `apps/api/.env` to a compatible executable. A missing audio tool is reported as a service problem and preserves the recording for retry.

Question generation retries malformed AI output once and validates the result before displaying it. Exact JSON code fences are accepted without relaxing field validation. Rejected responses log only request metadata and validation paths, never the recording, transcript, or model output.

OpenRouter's model listing currently advertises audio input and structured outputs for Gemini 2.5 Flash. Real end-to-end provider quality, filler fidelity, and format compatibility still need validation with actual recordings and your API key. OpenRouter/downstream retention depends on their current policies and account/provider settings; local deletion cannot delete provider-held copies. See [OpenRouter data collection](https://openrouter.ai/docs/guides/privacy/data-collection). No zero-retention promise is made.

## Checks

```sh
pnpm check
npx expo export --platform web
npx expo-doctor
```

Regression tests use isolated synthetic audio, provider stubs, and local-state fixtures, never user-facing fixtures. They check scoring arithmetic, context validation, real audio duration limits, multipart integration, service recovery, rate-limit propagation, prompt cancellation, guarded preparation replacement, retry baselines, saved goals, corrupt metadata, and failed or cancelled persistence. `pnpm check` runs lint, app/API typechecks, and all regression tests.

The product decisions and ADRs in `docs/` record the accepted architecture and the earlier documentation phase. Application and local backend implementation were subsequently authorized by the user. Public deployment remains deferred.
