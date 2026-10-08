import { redirect } from "@sveltejs/kit";
import type { ArmorConfig, ArmorOauth, ArmorTokenExchange } from "../contracts";
import { queryParamsCreate, throwIfUndefined } from "@nekm/core";
import type { JWTVerifyGetKey } from "jose";
import type { RouteFactory } from "./routes";
import {
	urlConcat,
	isTokenExchange,
	exchangeToTokens,
	safeRedirectPath,
} from "../utils/utils";
import { jwtVerifyIdToken } from "../utils/jwt";
import { eventStateValid } from "../utils/event";
import { ROUTE_PATH_LOGIN } from "./login";
import { armorLog } from "../logging";

export const ROUTE_PATH_REDIRECT_LOGIN = "/_armor/redirect/login";

export const routeRedirectLoginFactory: RouteFactory = (
	config: ArmorConfig,
	oauth: ArmorOauth,
	jwks: JWTVerifyGetKey,
) => {
	async function exchangeCodeForToken(
		fetch: typeof global.fetch,
		origin: string,
		code: string,
	): Promise<ArmorTokenExchange> {
		const params: Record<string, string> = {
			grant_type: "authorization_code",
			client_id: oauth.clientId,
			client_secret: oauth.clientSecret,
			code,
			redirect_uri: urlConcat(origin, ROUTE_PATH_REDIRECT_LOGIN),
			scope: oauth.scope,
		};

		if (config.oauth.audience) {
			params.audience = config.oauth.audience;
		}

		const response = await fetch(oauth.tokenEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
			},
			body: new URLSearchParams(params).toString(),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Token exchange failed: ${error}`);
		}

		const token = await response.json();

		if (!isTokenExchange(token)) {
			throw new Error("Response is not a valid token exchange.");
		}

		return token;
	}

	return {
		path: ROUTE_PATH_REDIRECT_LOGIN,
		async handle({ event }) {
			armorLog(
				config,
				"oauth.login_callback",
				"Handle login redirect callback.",
			);

			// If the states does not match, redirect the user to login.
			// People bookmark the wrong pages all the time. Lets not
			// do a throw here.
			if (!eventStateValid(event)) {
				armorLog(
					config,
					"oauth.state_mismatch",
					"OAuth state mismatch. Redirecting to login.",
				);
				throw redirect(302, ROUTE_PATH_LOGIN);
			}

			const error = event.url.searchParams.get("error") ?? undefined;

			if (error) {
				const error_description =
					event.url.searchParams.get("error_description") ?? undefined;

				armorLog(config, "oauth.login_error", "Login returned error.", {
					error,
					errorDescription: error_description,
				});

				if (!config.oauth.errorLoginRedirectPath) {
					return new Response(`${error}\n${error_description}`.trimEnd(), {
						headers: {
							"Content-Type": "text/plain",
						},
					});
				}

				const errorParams = queryParamsCreate({ error, error_description });
				throw redirect(
					302,
					`${config.oauth.errorLoginRedirectPath}?${errorParams}`,
				);
			}

			const code = event.url.searchParams.get("code") ?? undefined;
			armorLog(
				config,
				"oauth.authorization_code",
				"Get code from query params.",
				{ code },
			);
			throwIfUndefined(code);

			const exchange = await exchangeCodeForToken(
				event.fetch,
				event.url.origin,
				code,
			);

			armorLog(config, "oauth.token_exchange", "Exchange code for tokens.", {
				exchange,
			});

			const idToken = await jwtVerifyIdToken(config, jwks, exchange.id_token);

			armorLog(config, "oauth.tokens_verified", "Extract and verify tokens.", {
				idToken,
			});

			await config.session.login(event, exchangeToTokens(exchange, idToken));

			const target = safeRedirectPath(await config.session.getRedirect(event));

			throw redirect(302, target);
		},
	};
};
