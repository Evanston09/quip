import { createMiddleware } from "hono/factory";
import { ServiceError } from "./provider.ts";

export const requireAuth = createMiddleware(async (c, next) => {
  const authorization = c.req.header("Authorization");
  if (!authorization || !/^Bearer \S+$/i.test(authorization))
    throw new ServiceError(
      401,
      "SIGN_IN_REQUIRED",
      "Sign in to continue.",
      true,
    );
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new ServiceError(
      503,
      "AUTH_UNCONFIGURED",
      "Sign-in is unavailable right now. Please try again later.",
      true,
    );
  let response: Response;
  try {
    // Ask Supabase Auth to validate the token; never trust a decoded JWT payload.
    response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: authorization },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new ServiceError(
      503,
      "AUTH_UNAVAILABLE",
      "Couldn’t check your sign-in. Please try again.",
      true,
    );
  }
  if (response.status === 401 || response.status === 403)
    throw new ServiceError(
      401,
      "SIGN_IN_REQUIRED",
      "Sign in again to continue.",
      true,
    );
  if (!response.ok)
    throw new ServiceError(
      503,
      "AUTH_UNAVAILABLE",
      "Couldn’t check your sign-in. Please try again.",
      true,
    );
  const user = (await response.json()) as {
    id?: string;
    email?: string;
    is_anonymous?: boolean;
  };
  if (!user.id || !user.email || user.is_anonymous)
    throw new ServiceError(
      401,
      "SIGN_IN_REQUIRED",
      "Sign in with your email and password to continue.",
      true,
    );
  await next();
});
