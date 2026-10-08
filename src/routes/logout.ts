import { redirect } from "@sveltejs/kit";
import type { ArmorConfig } from "../contracts";
import { queryParamsCreate } from "@nekm/core";
import { ROUTE_PATH_REDIRECT_LOGOUT } from "./redirect-logout";
import type { RouteFactory } from "./routes";
import { urlConcat } from "../utils/utils";
import { ARMOR_LOGOUT } from "../browser";
import { armorLog } from "../logging";

export const ROUTE_PATH_LOGOUT = ARMOR_LOGOUT;

export const routeLogoutFactory: RouteFactory = (config: ArmorConfig) => {
	// Check if the oauth provider supports a logout path.
	if (!config.oauth.logoutEndpoint) {
		return undefined;
	}

	const returnTo = config.oauth.logoutReturnToParam ?? "logout_uri";

	return {
		path: ROUTE_PATH_LOGOUT,
		async handle({ event }) {
			const params = {
				[returnTo]: urlConcat(event.url.origin, ROUTE_PATH_REDIRECT_LOGOUT),
				client_id: config.oauth.clientId,
			};

			const paramsStr = queryParamsCreate(params);

			armorLog(config, "oauth.logout_redirect", "Pre logout redirect.", {
				params,
			});

			throw redirect(302, `${config.oauth.logoutEndpoint}?${paramsStr}`);
		},
	};
};
