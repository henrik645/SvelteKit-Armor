import { type Handle } from "@sveltejs/kit";
import { createRemoteJWKSet } from "jose";
import { armorRedirectToLogin } from "./routes/login";
import type {
	ArmorConfig,
	ArmorIdToken,
	ArmorOauth,
	ArmorOpenIdConfig,
} from "./contracts";
import { routeByPathFactory } from "./routes/routes";
import { ArmorOpenIdConfigError } from "./errors";
import { armorOauthResolve } from "./utils/utils";
import { jwtVerifyIdToken } from "./utils/jwt";
import { armorLog } from "./logging";

export * from "./contracts";
export * from "./session/cookie";
export * from "./errors";
export { armorRedirectToLogin } from "./routes/login";

export interface Armor {
	readonly handle: Handle;
	/**
	 * The oauth configuration with every default applied. Armor does not
	 * refresh tokens — use these values to run your own refresh_token grant.
	 */
	readonly oauth: ArmorOauth;
	/**
	 * Verify and parse an id token against the IdP's JWKS. Call this on a
	 * rotated id token before writing it to the session, so claims you
	 * authorize on stay current.
	 */
	readonly armorVerifyIdToken: (idToken: string) => Promise<ArmorIdToken>;
}

export function armor(config: ArmorConfig): Armor {
	const oauth = armorOauthResolve(config);
	const jwks = createRemoteJWKSet(new URL(oauth.jwksEndpoint));
	const routeByPath = routeByPathFactory(config, oauth, jwks);
	const requireLogin = config.requireLogin ?? (() => true);

	return {
		oauth,
		armorVerifyIdToken: (idToken) => jwtVerifyIdToken(config, jwks, idToken),
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
				armorLog(
					config,
					"auth.missing_tokens",
					"Could not find tokens. Redirecting to login.",
				);
				armorRedirectToLogin(event);
			}

			return resolve(event);
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
		},
	};
}
