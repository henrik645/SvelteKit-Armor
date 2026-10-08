import { describe, expect, test, vi } from "vitest";
import type { ArmorConfig } from "./contracts";
import { armorLog } from "./logging";

function configWith(
	levels?: ArmorConfig["logging"],
): Pick<ArmorConfig, "logger" | "logging"> {
	return {
		logger: {
			debug: vi.fn(),
			info: vi.fn(),
			warning: vi.fn(),
			error: vi.fn(),
		},
		logging: levels,
	};
}

describe("armorLog", () => {
	test("uses the default level and includes the event key", () => {
		const config = configWith();

		armorLog(config as ArmorConfig, "oauth.state_mismatch", "State mismatch.", {
			reason: "different",
		});

		expect(config.logger?.warning).toHaveBeenCalledWith("State mismatch.", {
			reason: "different",
			armorEvent: "oauth.state_mismatch",
		});
	});

	test("logs missing tokens at debug by default", () => {
		const config = configWith();

		armorLog(config as ArmorConfig, "auth.missing_tokens", "Missing tokens.");

		expect(config.logger?.debug).toHaveBeenCalledWith("Missing tokens.", {
			armorEvent: "auth.missing_tokens",
		});
	});

	test("uses an overridden level", () => {
		const config = configWith({
			levels: { "oauth.state_mismatch": "info" },
		});

		armorLog(config as ArmorConfig, "oauth.state_mismatch", "State mismatch.");

		expect(config.logger?.info).toHaveBeenCalledWith("State mismatch.", {
			armorEvent: "oauth.state_mismatch",
		});
		expect(config.logger?.warning).not.toHaveBeenCalled();
	});

	test("can silence an event", () => {
		const config = configWith({
			levels: { "oauth.state_mismatch": false },
		});

		armorLog(config as ArmorConfig, "oauth.state_mismatch", "State mismatch.");

		expect(config.logger?.debug).not.toHaveBeenCalled();
		expect(config.logger?.info).not.toHaveBeenCalled();
		expect(config.logger?.warning).not.toHaveBeenCalled();
		expect(config.logger?.error).not.toHaveBeenCalled();
	});
});
