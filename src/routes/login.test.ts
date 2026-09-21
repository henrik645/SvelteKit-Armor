import type { RequestEvent } from "@sveltejs/kit";
import { describe, expect, it, vi } from "vitest";
import { armor } from "../index";
import type { ArmorConfig } from "../contracts";

describe("Armor.login", () => {
	it("starts login with a return path and prompt", async () => {
		const setRedirect = vi.fn();
		const cookieSet = vi.fn();
		const config = {
			oauth: {
				clientId: "client-id",
				clientSecret: "client-secret",
				issuer: "https://issuer.test",
				jwksEndpoint: "https://issuer.test/jwks",
				authorizeEndpoint: "https://issuer.test/authorize",
				tokenEndpoint: "https://issuer.test/token",
				refreshEndpoint: "https://issuer.test/token",
			},
			session: {
				setRedirect,
			},
		} as unknown as ArmorConfig;
		const event = {
			url: new URL("https://app.test/chat/session"),
			cookies: { set: cookieSet },
		} as unknown as RequestEvent;

		await expect(
			armor(config).login(event, {
				redirect: "/chat/session",
				prompt: "login",
			}),
		).rejects.toMatchObject({
			status: 302,
			location: expect.stringContaining("prompt=login"),
		});

		expect(setRedirect).toHaveBeenCalledWith(event, "/chat/session");
		expect(cookieSet).toHaveBeenCalledWith(
			"state",
			expect.any(String),
			expect.objectContaining({ httpOnly: true }),
		);
	});
});
