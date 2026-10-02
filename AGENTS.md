# Speaking Coach

Mobile-first English speaking practice app built with Expo and React Native. Users record impromptu explanations, interview answers, or rehearsed speeches and receive AI feedback. See `README.md` for setup and product details.

## Project layout

- `src/app/`: Expo Router screens and layouts. Keep components, hooks, and utilities outside this directory.
- `src/components/`: shared UI; NativeWind and React Native Reusables provide styling.
- `src/domain/`: practice types, validation, and scoring.
- `src/state/` and `src/services/`: app state, local persistence, and API calls.
- `apps/api/`: Hono backend for prompts and audio analysis.

## Commands

Use pnpm for this workspace.

```sh
pnpm install
pnpm start          # Expo development server
pnpm web           # Web app
pnpm api           # Local API server
pnpm check         # App lint, app/API typechecks, and API tests
```

Run lint and typecheck before finishing work. For backend changes, also run API tests; `pnpm check` covers all three.

## Expo and mobile rules

- Before changing Expo, EAS, or React Native API usage, read the Expo major version in `package.json` and consult `https://docs.expo.dev/versions/v<major>.0.0/`. For other Expo topics, follow the relevant links in `https://docs.expo.dev/llms.txt`.
- Use Expo Router for navigation, importing routing APIs from `expo-router`.
- Install app dependencies with `npx expo install <package> -- -w` to resolve SDK-compatible versions. Prefer recommended Expo modules.
- Keep iOS, Android, and web behavior in mind, especially microphone permissions, recording lifecycle, and persistent audio.
- Configure native behavior through app config and config plugins. Do not create or edit generated `ios/` or `android/` directories by hand.
- Native modules unavailable in Expo Go require a development build.
- Use `npx eas-cli@latest` for EAS cloud builds, submission, and updates when requested.

## Product constraints

- Use real recordings, prompts, and feedback; do not fabricate practice history or results.
- Recordings and history are stored locally per account. Cloud history synchronization is not implemented.
- Keep AI provider credentials on the backend. Never put secrets in `EXPO_PUBLIC_` variables.
