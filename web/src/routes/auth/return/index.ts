/**
 * Auth Callback Route - Handles successful authentication from auth.kailasa.ai
 * GET /auth/return?auth_code=...
 *
 * Flow:
 * 1. Receive auth_code from auth service
 * 2. Exchange auth_code for server-trust session_token
 * 3. Store session_token in HttpOnly cookies
 * 4. Redirect to the main application
 *
 * Note: The auth server may append auth_code in different ways depending on 
 * whether the redirect_uri already has query params. We handle both cases.
 */

import type { RequestHandler } from "@builder.io/qwik-city";
import { exchangeAuthCode, normalizeReturnTo } from "~/utils/auth-service";

function extractAuthFromRedirectTo(redirectTo: string, baseUrl: string) {
    try {
        const parsed = new URL(redirectTo, baseUrl);
        const embeddedAuthCode = parsed.searchParams.get("auth_code");
        if (!embeddedAuthCode) {
            return { embeddedAuthCode: undefined, cleanedRedirectTo: redirectTo };
        }

        parsed.searchParams.delete("auth_code");
        const cleanedRedirectTo = parsed.pathname + parsed.search + parsed.hash;
        return { embeddedAuthCode, cleanedRedirectTo };
    } catch {
        // If parsing fails, keep the original redirectTo untouched
        return { embeddedAuthCode: undefined, cleanedRedirectTo: redirectTo };
    }
}

export const onGet: RequestHandler = async ({ url, cookie, redirect, env, error }) => {
    // Try to get auth_code directly from query params first
    let authCode = url.searchParams.get("auth_code");
    let returnTo = url.searchParams.get("returnTo");

    // If auth_code is not found, the auth server might have appended it incorrectly
    // Check if it's embedded in the returnTo value (e.g., returnTo=/live/?auth_code=xxx)
    if (!authCode && returnTo && returnTo.includes("?auth_code=")) {
        const parts = returnTo.split("?auth_code=");
        returnTo = parts[0]; // Clean path before ?auth_code
        authCode = parts[1]?.split("&")[0]; // Extract auth_code value
    }

    // Also try parsing from the raw URL in case of weird encoding
    if (!authCode) {
        const rawUrl = url.toString();
        const authCodeMatch = rawUrl.match(/[?&]auth_code=([^&]+)/);
        if (authCodeMatch) {
            authCode = authCodeMatch[1];
        }
    }

    const redirectTo = url.searchParams.get("redirect_to");
    const baseUrl = env.get("BASE_URL") || "http://localhost:5173";

    // Determine final destination, preferring returnTo, then redirect_to, then default
    const destination = normalizeReturnTo(returnTo || redirectTo, baseUrl) || "/playlists";

    if (!authCode) {
        console.error("[auth/return] No auth_code found. URL:", url.toString());
        throw error(400, "Missing auth_code parameter");
    }

    const authBase = env.get("AUTH_BASE");
    const clientId = env.get("AUTH_CLIENT_ID");
    const clientSecret = env.get("AUTH_CLIENT_SECRET");

    if (!authBase || !clientId || !clientSecret) {
        throw error(500, "Auth configuration missing");
    }

    let sessionToken: string;

    try {
        const exchangeResult = await exchangeAuthCode(authCode, clientId, clientSecret, authBase);
        sessionToken = exchangeResult.session_token;
    } catch (err) {
        console.error("Auth callback error:", err);
        throw error(500, `Authentication failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }

    cookie.set("nandi_session_token", sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24, // 1 day
    });

    throw redirect(302, destination);
};
