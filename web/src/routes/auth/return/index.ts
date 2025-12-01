/**
 * Auth Callback Route - Handles successful authentication from auth.kailasa.ai
 * GET /auth/return?auth_code=...
 *
 * Flow:
 * 1. Receive auth_code from auth service
 * 2. Exchange auth_code for server-trust session_token
 * 3. Store session_token in HttpOnly cookies
 * 4. Redirect to the main application
 */

import type { RequestHandler } from "@builder.io/qwik-city";
import { exchangeAuthCode } from "~/utils/auth-service";

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
    const redirectToParam = url.searchParams.get("redirect_to") || "/playlists";
    const { embeddedAuthCode, cleanedRedirectTo } = extractAuthFromRedirectTo(redirectToParam, url.origin);

    const authCode = url.searchParams.get("auth_code") || embeddedAuthCode;
    const redirectTo = cleanedRedirectTo || "/playlists";

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

    throw redirect(302, redirectTo);
};
