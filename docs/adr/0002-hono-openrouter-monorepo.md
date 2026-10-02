# Hono backend and OpenRouter in a monorepo

Plan a separately runnable Hono REST backend alongside the Expo app in this repository, with all AI requests routed through OpenRouter. This follows the user's preference over the proposed Expo Router API-route approach, keeps AI credentials on the server, and establishes one gateway for AI features; the trade-off is a second development process and dependence on the audio and output capabilities of models available through OpenRouter. The REST boundary remains independent of individual models, while recordings and practice history remain local to the device.

This is an accepted architecture direction, not authorization to implement it now. Backend code, dependencies, workspace restructuring, and deployment are deferred; the current task changes documentation only.
