import { redirect } from "@sveltejs/kit";
import type { ArmorConfig } from "../contracts";
import type { RouteFactory } from "./routes";
import { armorLog } from "../logging";

export const ROUTE_PATH_REDIRECT_LOGOUT = "/_armor/redirect/logout";

export const routeRedirectLogoutFactory: RouteFactory = (
	config: ArmorConfig,
) => {
	// Check if the oauth provider supports a logout path.
	if (!config.oauth.logoutEndpoint) {
		return undefined;
	}

	return {
		path: ROUTE_PATH_REDIRECT_LOGOUT,
		async handle({ event }) {
			armorLog(
				config,
				"oauth.logout_callback",
				"Handle logout redirect callback.",
			);

			await config.session.logout(event);

			throw redirect(302, "/");
		},
	};
};
