import { redirect, type Handle } from "@sveltejs/kit";
import {
	armorLoginFactory,
	type ArmorLogin,
	loginPathWithRedirect,
} from "./routes/login";
import type { ArmorConfig, ArmorOpenIdConfig } from "./contracts";
import { routeByPathFactory } from "./routes/routes";
import { ArmorOpenIdConfigError } from "./errors";
import { ArmorRefresh, armorRefreshFactory } from "./utils/refresh";

export * from "./contracts";
export * from "./session/cookie";
export type { ArmorLogin, ArmorLoginOptions } from "./routes/login";
export { armorRefreshFactory } from "./utils/refresh";
export * from "./errors";

export interface Armor extends ArmorRefresh {
	readonly handle: Handle;
	readonly login: ArmorLogin;
}

export function armor(config: ArmorConfig): Armor {
	const routeByPath = routeByPathFactory(config);
	const refresh = armorRefreshFactory(config);
	const login = armorLoginFactory(config);
	const requireLogin = config.requireLogin ?? (() => true);

	return {
		...refresh,
		login,
		async handle({ event, resolve }) {
			const route = routeByPath.get(event.url.pathname);

			if (route) {
				return route.handle({ event, resolve });
			}

			if (!requireLogin(event)) {
				return resolve(event);
			}

			const tokens = await config.session.getTokens(event);

			if (!tokens) {
				config.logger?.warning?.(
					"Could not find tokens. Redirecting to login.",
				);
				throw redirect(302, loginPathWithRedirect(event));
			}

			return refresh.ensureValidToken(event, tokens, () => resolve(event));
		},
	};
}

/**
 * Some IdP's expose a /.well-known/openid-configuration that specifies how to configure.
 * Use that to create your config.
 * @param config
 * @param fetch
 */
export async function armorConfigFromOpenId(
	config: ArmorOpenIdConfig,
	fetch?: typeof global.fetch,
): Promise<ArmorConfig> {
	const fetchToUse = fetch ?? global.fetch;

	const response = await fetchToUse(config.oauth.openIdConfigEndpoint, {
		headers: {
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		const text = await response.text();
		throw new ArmorOpenIdConfigError(text);
	}

	const body = await response.json();

	return {
		...config,
		oauth: {
			...config.oauth,
			tokenEndpoint: body.token_endpoint,
			authorizeEndpoint: body.authorization_endpoint,
			issuer: body.issuer,
			jwksEndpoint: body.jwks_uri,
			logoutEndpoint: body.end_session_endpoint ?? undefined,
			refreshEndpoint: body.token_endpoint,
		},
	};
}
