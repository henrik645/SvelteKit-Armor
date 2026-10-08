# SvelteKit Armor

> [!IMPORTANT]
> The library is being tested in production and will be tagged `1.0.0` once I'm confident it works.

Highly opinionated, minimal config OAuth protection for [SvelteKit](https://svelte.dev/) apps. Get login working in few lines of code - no complex setup, no custom UI, just secure authentication using your own OAuth 2.0/OIDC IdP hosted UI, such as [AWS Cognito](https://aws.amazon.com/pm/cognito/) or [auth0](https://auth0.com/).

## Installation
Install with your favorite package manager:

```bash
npm install --save @nekm/sveltekit-armor @sveltejs/kit
```

## Usage

Create a `src/hooks.server.ts` and write:

```js
import { armor, armorCookieSession } from '@nekm/sveltekit-armor';

const { handle: armorHandle } = armor({
	oauth: {
		clientId: 'foo',
		clientSecret: 'bar',
		baseUrl: 'https://myapp.auth.eu-west-1.amazoncognito.com',
		issuer: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_ABC123xyz',
	},
	session: armorCookieSession,
});

export const handle = armorHandle;
```

Done. Entire app now requires login.

Access the tokens:

```js
import {armorCookieSessionGet} from '@nekm/sveltekit-armor';

const tokens = armorCookieSessionGet(event.cookies);
```

For simplicity, we provide you with a default cookie session, but it is recommended to write your own session storage to store tokens in your database.

## Logging

Pass a logger with any of the supported log-level functions:

```js
const { handle: armorHandle } = armor({
	// oauth and session configuration
	logger: {
		debug: (message, params) => console.debug(message, params),
		info: (message, params) => console.info(message, params),
		warning: (message, params) => console.warn(message, params),
		error: (message, params) => console.error(message, params),
	},
});
```

Each log includes a stable `armorEvent` key in its parameters. Override the
default level of individual events, or set an event to `false` to silence it:

```js
const { handle: armorHandle } = armor({
	// oauth, session and logger configuration
	logging: {
		levels: {
			"oauth.state_mismatch": "info",
			"auth.missing_tokens": false,
		},
	},
});
```

| Event key | Default level |
| --- | --- |
| `auth.missing_tokens` | `debug` |
| `oauth.login_redirect` | `debug` |
| `oauth.login_callback` | `debug` |
| `oauth.state_mismatch` | `warning` |
| `oauth.login_error` | `error` |
| `oauth.authorization_code` | `debug` |
| `oauth.token_exchange` | `debug` |
| `oauth.tokens_verified` | `debug` |
| `oauth.logout_redirect` | `debug` |
| `oauth.logout_callback` | `debug` |

## Routes

Your app will now expose these routes:

* `/_armor/login` - Redirect the user here to initiate a login.
* `/_armor/redirect/login` - Configure your IdP to redirect here.
* `/_armor/logout` - Only if logout endpoint is configured.
* `/_armor/redirect/logout` - Only if logout endpoint is configured.

## Examples

### Protect only certain routes

Assume you only want to protect routes prefixed by `admin`. Create a `src/hooks.server.ts` and write:

```js
import { armor } from '@nekm/sveltekit-armor';

const { handle: armorHandle } = armor({ /* config */ });

export const handle = ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/admin')) {
		return armorHandle({ event, resolve });
	}

	return resolve(event);
}
```

## Versioning

This project complies with [Semantic Versioning](https://semver.org/).

## Changelog

For a complete list of changes, and how to migrate between major versions, see [releases page](https://github.com/Ekman/SvelteKit-Armor/releases).

## Buy me a coffee

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/nekman)

If you appreciate my work, then consider [buying me a coffee](https://buymeacoffee.com/nekman). Donations are completely voluntary.
