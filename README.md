# Speaking Coach

A mobile-first, audio-only English speaking coach built with Expo SDK 57, Expo Router, NativeWind, and React Native Reusables. The original koala and eucalyptus palette accompany real practice; the app starts with empty history and never fabricates prompts, recordings, or feedback.

Choose **Impromptu** for scientific explanations, **Interview** for common behavioral questions, or **Rehearse** for your own outline and audience. Prepare, record, receive content and delivery feedback, choose a goal, and retry the same prompt with a comparison. History groups retries and separates score trends by mode.

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

## Required sign-in

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` in the root `.env` using your project's URL and publishable key (a legacy anon key also works). Set the same values as `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `apps/api/.env`. Never use secret/service-role keys in the app.

In the Supabase dashboard, open **Authentication → Sign In / Providers → Email**, enable email/password and disable **Confirm email**. Account creation checks this setting first so it does not send verification emails. Email and password are the only login methods; there is no guest access, OAuth, or email recovery flow.

Sign-in is mandatory for practice, history, and results, including direct links. Sessions persist in SecureStore on native and browser storage on web. Native token refresh follows app foreground/background state. Both AI endpoints validate the bearer token with Supabase Auth before processing a request. Use **Account → Sign out** to end this device's session; finish active recording first.

Practice history remains local, separated by Supabase user ID. Signing into another account starts with that account's own data. Existing guest data is not imported. This auth-only change creates no application tables, RLS policies, backfills, or cloud synchronization.

`expo-audio`, `expo-asset`, `expo-file-system`, and AsyncStorage were installed using `expo install` with SDK-compatible versions. A development build is needed when your Expo Go binary does not include the installed native modules. Microphone permission is configured through the Expo audio plugin, with background recording disabled. Native directories are generated, never maintained by hand. For future dependency additions at this workspace root, pass the pnpm workspace flag through Expo: `npx expo install <package> -- -w`.

## Recording and recovery

Preparation deadlines and prompts persist across restarts. Native recordings go directly to the app document directory. Web recordings persist as Blobs in IndexedDB; metadata and feedback use AsyncStorage. Finish and the three/five-minute caps save locally before automatic analysis. Leaving the app or a recoverable audio interruption preserves audio and offers Submit or Start over. Abrupt browser termination during recording may lose an unfinished browser recording; completed audio remains durable. Native startup attempts to recover an unfinished file.

Analysis is a single synchronous request. Navigation can continue during processing. An unresolved request after restart becomes Needs retry. Retrying analysis updates the same attempt, so practice counts do not inflate. Deletion discards late analysis responses and removes comparisons that reference the deleted attempt.

## AI service

- `GET /health`: service readiness and whether a key is configured.
- `POST /v1/prompts`: JSON `mode` and scientific `difficulty`.
- `POST /v1/analyses`: multipart `audio` and `context` JSON.

Gemini receives the recording itself through OpenRouter audio-input chat and returns a verbatim transcript, detected fillers, rubric judgments, and coaching in validated structured JSON. Each applicable criterion is required. The server averages criteria, calculates the equally weighted overall score and retry differences, and derives words/minute from transcript word count and actual audio duration. There are no invented timestamps or pause measurements. Vocal and scientific assessments are AI opinions. Filler detection is accepted as an MVP assumption, not measured accuracy.

Uploads are limited to 24 MB. A bundled FFprobe validates actual audio format and duration rather than trusting client claims, including packet timing when browser WebM duration metadata is absent. Accepted containers: M4A, WebM, WAV, MP3, OGG. Temporary audio is removed after validation; the service does not maintain a database or durable audio storage. Provider format support can still vary and is surfaced as a retryable analysis failure.

OpenRouter's model listing currently advertises audio input and structured outputs for Gemini 2.5 Flash. Real end-to-end provider quality, filler fidelity, and format compatibility still need validation with actual recordings and your API key. OpenRouter/downstream retention depends on their current policies and account/provider settings; local deletion cannot delete provider-held copies. See [OpenRouter data collection](https://openrouter.ai/docs/guides/privacy/data-collection). No zero-retention promise is made.

## Checks

```sh
pnpm check
npx expo export --platform web
npx expo-doctor
```

API tests use isolated synthetic audio and provider stubs, never user-facing fixtures. They check scoring arithmetic, context validation, real audio duration limits, multipart integration, unconfigured service recovery, and rate-limit propagation.

The product decisions and ADRs in `docs/` record the accepted architecture and the earlier documentation phase. Application and local backend implementation were subsequently authorized by the user. Public deployment remains deferred.
