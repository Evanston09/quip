# Cloud analysis with on-device practice history

The audio-only hackathon MVP uses cloud AI analysis and keeps saved recordings, feedback, and retry comparisons on the device without requiring an account. This enables personalized feedback and a simple demo flow without building account-based synchronization, at the cost of requiring connectivity for analysis and limiting history to the device. ADR 0002 selects Hono and OpenRouter; model selection and retention behavior remain to be verified.

Backend implementation and hosting are explicitly deferred. The current plan defines a small REST boundary for later integration; development is limited to this machine for now, with no commitment to Expo-hosted API routes.
