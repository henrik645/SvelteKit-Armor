import type { ArmorConfig, ArmorLogEvent, ArmorLogLevel } from "./contracts";

const defaultLogLevels = Object.freeze({
	"auth.missing_tokens": "debug",
	"oauth.login_redirect": "debug",
	"oauth.login_callback": "debug",
	"oauth.state_mismatch": "warning",
	"oauth.login_error": "error",
	"oauth.authorization_code": "debug",
	"oauth.token_exchange": "debug",
	"oauth.tokens_verified": "debug",
	"oauth.logout_redirect": "debug",
	"oauth.logout_callback": "debug",
} satisfies Record<ArmorLogEvent, ArmorLogLevel>);

export function armorLog(
	config: ArmorConfig,
	event: ArmorLogEvent,
	message: string,
	params?: Record<string, unknown>,
): void {
	const level = config.logging?.levels?.[event] ?? defaultLogLevels[event];

	if (level === false) {
		return;
	}

	config.logger?.[level]?.(message, { ...params, armorEvent: event });
}
