/**
 * Auth Callback Route - Handles successful authentication from auth.kailasa.ai
 * GET /auth/return?auth_code=...&session_token=...
 *
 * Flow:
 * 1. Receive auth_code from auth service
 * 2. Exchange auth_code for server-trust session_token
 * 3. Store session_token in HttpOnly cookies
 * 4. Redirect to the main application
 */

import type { RequestHandler } from "@builder.io/qwik-city";
import { exchangeAuthCode, calculateCookieMaxAge } from "~/utils/auth-service";

export const onGet: RequestHandler = async ({ url, cookie, redirect, env, error }) => {
    const authCode = url.searchParams.get("auth_code");
    const redirectTo = url.searchParams.get("redirect_to") || "/playlists";

    if (!authCode) {
        throw error(400, "Missing auth_code parameter");
    }

    const authBase = env.get("AUTH_BASE");
    const clientId = env.get("AUTH_CLIENT_ID");
    const clientSecret = env.get("AUTH_CLIENT_SECRET");

    if (!authBase || !clientId || !clientSecret) {
        throw error(500, "Auth configuration missing");
    }

    let sessionToken: string;
    let expiresAt: number;

    try {
        const exchangeResult = await exchangeAuthCode(authCode, clientId, clientSecret, authBase);
        sessionToken = exchangeResult.session_token;
        expiresAt = exchangeResult.expires_at;
    } catch (err) {
        console.error("Auth callback error:", err);
        throw error(500, `Authentication failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }

    const isProduction = env.get("PUBLIC_PRODUCTION") === "true";
    const maxAge = calculateCookieMaxAge(expiresAt);

    cookie.set("app_session_token", sessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge,
    });

    cookie.set("app_session_expires", expiresAt.toString(), {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge,
    });

    throw redirect(302, redirectTo);
};
