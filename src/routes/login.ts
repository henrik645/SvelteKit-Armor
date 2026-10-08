import { redirect, type RequestEvent } from "@sveltejs/kit";
import type { ArmorConfig, ArmorOauth } from "../contracts";
import { queryParamsCreate } from "@nekm/core";
import { ROUTE_PATH_REDIRECT_LOGIN } from "./redirect-login";
import { randomUUID } from "node:crypto";
import type { RouteFactory } from "./routes";
import { COOKIE_STATE, cookieSet } from "../utils/cookie";
import { urlConcat } from "../utils/utils";
import { ARMOR_LOGIN } from "../browser";
import { armorLog } from "../logging";

export const ROUTE_PATH_LOGIN = ARMOR_LOGIN;

export function loginPathWithRedirect(event: RequestEvent): string {
	const redirectTo = event.url.pathname + event.url.search;
	return `${ROUTE_PATH_LOGIN}?${queryParamsCreate({ redirect: redirectTo })}`;
}

/**
 * Send the user to the login flow, remembering the path they were on.
 * Armor does not refresh tokens. Raise this from your own token handling
 * when a refresh cannot produce a usable token.
 */
export function armorRedirectToLogin(event: RequestEvent): never {
	throw redirect(302, loginPathWithRedirect(event));
}

export const routeLoginFactory: RouteFactory = (
	config: ArmorConfig,
	oauth: ArmorOauth,
) => {
	return {
		path: ROUTE_PATH_LOGIN,
		async handle({ event }) {
			const state = randomUUID();
			cookieSet(event.cookies, COOKIE_STATE, state);

			const redirectTo = event.url.searchParams.get("redirect") ?? undefined;

			if (redirectTo) {
				await config.session.setRedirect(event, redirectTo);
			}

			const params = {
				client_id: oauth.clientId,
				response_type: "code",
				redirect_uri: urlConcat(event.url.origin, ROUTE_PATH_REDIRECT_LOGIN),
				state,
				scope: oauth.scope,
				audience: config.oauth.audience,
			};

			const paramsStr = queryParamsCreate(params);

			armorLog(config, "oauth.login_redirect", "Pre login redirect.", {
				params,
				state,
			});

			throw redirect(302, `${oauth.authorizeEndpoint}?${paramsStr}`);
		},
	};
};
