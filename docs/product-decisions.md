# Quip: interview decisions

Working record of the product interview, not a completed implementation specification. Unresolved choices remain open.

## Purpose and scope

- Mobile-first, audio-only, English-only hackathon MVP.
- Audience includes college students, interview preparation, and everyday speaking practice.
- All three modes are required: Impromptu, Interview, and Rehearse.
- Demo centerpiece: Interview question, recording, feedback, coaching goal, retry, and comparison.
- Development is limited to this machine for now. No public release, hosting setup, or backend implementation is requested yet.
- Do not prefill user inputs or seed sample recordings, history, transcripts, scores, feedback, or comparisons. Start with empty states and use actual user input and recordings. Frontend fixtures are not approved for the user-facing experience.

## Practice

- Impromptu generates scientific, non-political explanation prompts, such as explaining the double-slit experiment.
- Speakers choose Beginner, Intermediate, or Advanced difficulty. Prompts specify a target audience.
- Research happens on a computer or outside the app. Preserve the prompt and preparation deadline across leaving and returning to the app.
- Interview uses typical questions about weaknesses, past projects, and similar common interview topics; no role or school setup is required.
- Rehearse asks for main points and audience background; a full script is not required.
- In Impromptu and Interview, speakers choose their preparation limit and may start recording early. Timer expiry signals readiness; it does not automatically start recording. Rehearse has no preparation timer, including on retries; speakers provide their outline and audience, then choose when to start recording.
- Recording caps: three minutes for Impromptu/Interview, five minutes for Rehearse. Speakers may finish earlier.
- Display elapsed time and the mode's maximum duration, with a subtle warning at 15 seconds remaining. Stop and save when the cap is reached.
- On normal Finish or reaching the recording cap, save locally and submit automatically for analysis; no review-before-submission screen. Interrupted recordings retain the separate submit-or-start-over recovery flow.
- When a call or leaving the app interrupts recording, stop and preserve any recoverable audio. Let the speaker submit that audio or start over; do not silently record in the background.

## Feedback and retries

- Separate Content and Delivery sections, each scored out of 100; overall score is their equally weighted average.
- Content criteria shared by all modes: clarity, organization, relevance, and conciseness. Science additionally assesses accuracy and audience-appropriate explanation; Interview assesses concrete examples and whether the question was answered; Rehearse assesses outline coverage and audience appropriateness. Average applicable criterion scores into Content; finalize distinct criterion definitions to avoid double-counting relevance and answering the question.
- Delivery assesses pacing, pause placement, distracting fillers/repetition, intelligibility, and vocal expression. Describe audible behavior rather than inferring confidence or personality; do not penalize an accent itself.
- Use AI judgments with explanations. Scientific accuracy contributes to Impromptu content feedback based on Gemini's judgment, not externally sourced verification. Present corrections as AI feedback; external fact-checking is outside this MVP.
- Prominently flag serious factual mistakes identified by Gemini and prioritize correcting them as the recommended goal. Keep the agreed score calculation; no hidden penalties or score caps.
- Show overall and section scores, one strength, and one next-attempt goal first; expand sections for detailed criteria and evidence.
- Include roughly three concise, specific feedback points in each of the Content and Delivery sections, while preserving one main next-attempt goal. Favor useful, scannable feedback over lengthy commentary; do not pad with unsupported observations to meet a quota.
- Recommend one improvement goal; speakers may select another from the feedback.
- Offer Retry this, New prompt, and Finish for prompt-based modes; Retry speech and Finish for Rehearse.
- Compare a retry with the latest completed attempt on the same prompt or speech, skipping attempts without completed feedback and those marked for deletion. Name that baseline before retry and in feedback. Assess the selected goal using saved criterion evidence, transcripts, and supported statistics; previous audio is unavailable, so do not claim verified improvement in pauses or vocal expression. Link to the baseline for listening; improvement is not guaranteed.
- Speakers may save a coaching goal for new prompts and speeches across days, omit it for one practice, or clear it. Saved goals and each attempt's practiced goal remain local.
- Preserve completed recordings when analysis fails and offer Retry analysis, without requiring another recording.
- If OpenRouter is unavailable, preserving the recording and offering Retry analysis is sufficient for the demo. Do not fabricate results or add an offline AI fallback.
- Each new recorded attempt with completed feedback counts as a practice, including retries of the same prompt. Reprocessing the same recording does not count twice. Group retries together in history.
- Provide an expandable transcript alongside audio playback and highlight detected fillers. Transcript editing is deferred for the MVP.
- Users may return Home while analysis is pending. History shows Processing, Ready, or Needs retry; navigating between screens must not lose an attempt.
- Keep analysis synchronous and simple. If the app closes before saving a result, preserve the recording and offer Retry analysis when reopened; no durable background jobs for the MVP.
- Accept the selected transcription/analysis model's filler detections as sufficient for the MVP. Display detected filler counts without adding a separate accuracy study or validation gate; the user explicitly accepts potentially missed fillers. This is a product assumption, not a claim that accuracy has been measured.
- Handling unassessable criteria remains unresolved; the user favors AI coaching opinions and has not accepted a blanket score-withholding policy.

## History and presentation

- Save recordings, feedback, and comparisons on the device without required signup. Include practice counts and Content/Delivery score trends.
- Separate score trends by speaking mode and show difficulty where applicable. Use same-prompt retries for direct improvement comparisons; total practice count spans all modes.
- Cloud AI processing is accepted; see ADR 0001. Plan a Hono REST backend in this repository, with all AI requests routed through OpenRouter; see ADR 0002. Implementation is deferred.
- Users may delete an individual attempt and its audio and feedback, or delete all practice data after confirmation. Remove deleted attempts from progress calculations and preserve other attempts on the prompt. Remove comparisons referencing deleted attempts.
- Defer XP, levels, streaks, achievements, and separate vocabulary exercises. The Duolingo-inspired visual direction does not expand the MVP game mechanics.
- Home offers three mode cards, a Continue practicing shortcut, and recent progress; all modes are available immediately. Continue resumes unfinished preparation before historical results. Replacing unfinished preparation requires an explicit choice; opening or leaving old feedback never discards ongoing preparation. Leaving setup cancels pending prompt generation.
- Visual direction: playful, Duolingo-inspired, while still professional. The mascot is the original koala SVG, with no scarf and arms joined more closely to the shoulders. The user accepted the design with these revisions. The app is named Quip; its koala coach is Quippy.
- Show the koala on Home and Results only, never during recording.
- Coaching is warm and direct, with short, kind, easy-to-skim feedback.

## UI components and styling

- Use [React Native Reusables](https://github.com/founded-labs/react-native-reusables) as the component foundation, following its [official documentation](https://reactnativereusables.com/docs). Style its components consistently for Quip instead of introducing a competing UI system.
- Retain the project's existing NativeWind styling direction. The current `components.json` points to `src/global.css`, `tailwind.config.js`, and `@/components/ui`; treat these as existing configuration, not evidence that the final UI has been implemented.
- Approved palette: warm off-white backgrounds, charcoal text, and eucalyptus-green accents, complementing the gray koala.
- Use rounded cards and controls, readable type, generous spacing, and subtle completion celebrations. Maintain a professional, uncluttered appearance.
- Keep feedback short and scannable: clear headings, compact score cards, approximately three points each for Content and Delivery, one highlighted strength, one main goal, and expandable detail.
- Apply shared theme tokens to the reusable components when implementation begins. Exact color values and component-level styling remain implementation details; no styling changes are authorized as part of this documentation update.

## Minimal REST API plan — implement later

This is a proposed client/server contract, not an implemented service. Use Hono for the backend and OpenRouter for all AI requests. Keep the mobile-facing REST contract independent of individual models and hosting, with a configurable base URL. No Expo API-route or EAS Hosting commitment is made.

### Repository and service boundary

- Plan a minimal pnpm workspace monorepo: retain the existing Expo app at the repository root and add a separately runnable backend package at `apps/api/` when implementation is authorized. This layout is proposed; no migration or scaffolding is part of the documentation task.
- Hono owns request validation, OpenRouter calls, response validation, and mapping failures into the REST error format below.
- The app calls Hono; it does not call OpenRouter directly. Keep `OPENROUTER_API_KEY` exclusively in the backend environment.
- Route prompt generation, audio transcription/interpretation, scoring, coaching, and comparison commentary through OpenRouter. Use `google/gemini-2.5-flash` as the initial model for prompt generation and audio-aware coaching, including scoring and comparison commentary. Keep the model configurable; the user chose it "for now." The transcription approach remains to be validated.
- Calculate derived values such as score averages and differences in code. OpenRouter is the AI gateway, not a replacement for arithmetic or local storage.
- Before implementation, verify the chosen OpenRouter models support the required audio input, output structure, and any timing evidence. Do not assume OpenRouter exposes Whisper transcription endpoints or word timestamps. Accept filler detections as sufficient under the agreed MVP assumption; no separate filler-accuracy validation is required.
- Run locally for development on this machine. Deployment, runtime choice, and public access remain deferred. Do not add accounts, a cloud history database, or background job infrastructure for this MVP.

### Endpoints

| Method and path | Request | Successful response |
| --- | --- | --- |
| `POST /v1/prompts` | JSON: `mode` (`impromptu` or `interview`); `difficulty` for Impromptu | `200`: `{ prompt: { id, text, mode, difficulty, audience } }`; omit inapplicable fields |
| `POST /v1/analyses` | Multipart: `audio` file and `context` JSON described below | `200`: completed analysis described below |

Rehearse uses the speaker's supplied outline and audience and does not need prompt generation. New prompt calls generate alternatives; the client retains the original prompt for retries.

### Analysis input

- `attemptId`: client-generated identifier, retained when retrying analysis of the same recording.
- `mode`: `impromptu`, `interview`, or `rehearse`.
- `prompt`: snapshot of the prompt and its difficulty/audience for prompt-based practice; or `outline` and `audience` for Rehearse.
- `selectedGoal`: optional goal chosen before a retry.
- `previousAttempt`: optional previous attempt ID, transcript, and saved analysis for comparison on the same prompt or speech. The server does not need a history database.
- The server validates uploaded audio rather than trusting client duration claims. Enforce the agreed three/five-minute mode limits. Accepted audio formats and byte limits will be chosen with the recording/transcription implementation.

### Analysis output

- `attemptId`, `rubricVersion`, `transcript`.
- `content` and `delivery`: each contains a score from 0 to 100, approximately three concise feedback points, and criteria with explanations and evidence.
- `overallScore`: equal-weight average of Content and Delivery, rounded for display.
- `statistics`: detected fillers, speaking rate, and timing measurements supported by the selected analysis method. Do not invent timing or measurement values.
- `strength`, `recommendedGoal`, and `alternativeGoals` for the compact feedback screen and goal selection.
- `comparison`: optional previous-attempt ID, score changes, and commentary on the selected goal. Score differences are calculated from saved scores, not invented by the model.
- Timestamped evidence is included only when supported by the selected transcription/analysis approach. Detailed field types remain to be finalized after that validation.

### Request lifecycle and errors

- One request returns the completed result. No polling endpoint, job queue, account API, or server history CRUD is needed initially.
- Store audio and attempt context locally before requesting analysis. Update the existing attempt by `attemptId` when results arrive; retrying analysis must not create another practice entry.
- Prevent simultaneous duplicate requests for an attempt in the client. A retry may repeat provider work; server-side deduplication is deferred rather than promised.
- Return errors as `{ "error": { "code": "ANALYSIS_FAILED", "message": "Please try again.", "retryable": true } }`.
- Use `400` for invalid context, `413` for uploads beyond limits, `415` for unsupported audio, `422` for unusable audio, `429` for rate limits, and `5xx` for server/provider failures. Retryability depends on the error; honor `Retry-After` when supplied.
- App navigation can continue during a pending request. Closing the app may interrupt it; on reopening, unresolved attempts become Needs retry.
- Deletion is local. Discard late results for deleted attempts so pending analysis cannot recreate deleted history.
- OpenRouter credentials stay on the eventual Hono server. No intentional durable backend audio/history storage is planned; OpenRouter and selected downstream provider retention remain to be verified.

### Still open

Transcription approach, backend runtime and hosting, detailed scoring rubric, and timestamp support. AI service failure uses the agreed saved-recording and Retry analysis flow. Real generated prompts and feedback require the backend; do not substitute fixtures, fake processing, or fabricated results. User-written Rehearse context and real recording/playback can work locally before integration.

### Audio research — capability evidence, not a selected pipeline

OpenRouter documents separate [speech-to-text](https://openrouter.ai/docs/guides/overview/multimodal/stt) and [audio-input chat](https://openrouter.ai/docs/guides/overview/multimodal/audio) paths. Timestamp support depends on the transcription model; the generic transcription prompt is documented as ignored. Configure supported transcription options during integration and accept the returned filler detections for this MVP, as requested. These capabilities have not been tested on this project's recordings.

The user selected [Gemini 2.5 Flash](https://openrouter.ai/google/gemini-2.5-flash) for audio-aware coaching. It accepts the recording itself rather than only text, permitting feedback on audible vocal expression; its assessment quality still needs validation. A separate transcription step for the inspectable transcript and derived statistics remains proposed, not a finalized model choice or call sequence. Validate [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs) on the server. Keep measurements distinguishable from model opinions; gaps between word timestamps are estimates, not proven pause detection.

## Open technical work

- Verify Expo recording/storage APIs and Hono/OpenRouter integration against current documentation before implementation; validate Gemini 2.5 Flash for coaching and determine the transcription approach through OpenRouter.
- Use returned filler detections directly; do not add a filler-accuracy evaluation gate. Check timing API support when implementing timestamped playback.
- Define remaining rubric details and provider retention behavior. Implement the agreed failure recovery and Gemini-only scientific feedback; external scientific verification is out of scope.
- Confirm the complete build plan with the user before application implementation, as required by the grilling workflow.
