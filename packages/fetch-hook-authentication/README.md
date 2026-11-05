# `@contentgrid/fetch-hook-authentication`

[Fetch hook](../fetch-hooks/) to perform Bearer token authentication

## Usage

```typescript
import createBearerAuthenticationHook, {
    CompositeTokenSupplierBuilder,
    createCachingTokenSupplier,
    createContentgridTokenExchangeTokenSupplier,
} from "@contentgrid/fetch-hook-authentication";

const extensionTokenSupplier = createCachingTokenSupplier(
    createContentgridTokenExchangeTokenSupplier({
        exchangeUrl: applicationOrigin + "/.contentgrid/authentication/external/token",
    }),
    {
        // Never hand out a token that was obtained for a different user.
        // Resolved on every request, so keep it cheap.
        scope: () => currentUser?.sub ?? null,
        // No `key`: a token is only reused for the exact URI it was obtained for (see below)
    }
);

const authenticationHook = createBearerAuthenticationHook({
    tokenSupplier: new CompositeTokenSupplierBuilder()
        .origin(applicationOrigin, userTokenSupplier)
        .default(extensionTokenSupplier)
        .build(),
});
```

### Caching tokens

`createCachingTokenSupplier(supplier, options)` keeps the tokens supplied by another token supplier in memory.
A cached token is handed out until it is close to its expiry (`expiryMargin`, 30 seconds by default); the next request then obtains a new token.
Tokens without an expiry and failures are never cached, and concurrent requests for the same token share a single call to the wrapped supplier.
A timer removes each cached token from memory once it can no longer be handed out, so the cache does not grow over a long session. In Node.js these timers don't keep the process alive.
Browsers can delay timers (e.g. in background tabs), so the expiry is also checked whenever a cached token is requested; an expired token is never handed out.

| Option         | Default                | Description                                                                                       |
|----------------|------------------------|---------------------------------------------------------------------------------------------------|
| `key`          | the full request URI   | Maps a request URI to a cache key; requests with the same key share a token (e.g. `uri => new URL(uri).origin`) |
| `scope`        | one shared scope       | The scope tokens belong to (e.g. the signed-in user). A `null` scope removes all cached tokens and returns `null` without obtaining a token |
| `expiryMargin` | `30_000`               | Milliseconds before expiry at which a cached token is no longer handed out                          |

#### Choosing a `key`

The default key is the full request URI. For the ContentGrid token exchange this is the safe default:
the decision to issue a token may depend on the exact resource (its path and query), so a token is only reused for the resource it was obtained for.
The downside is that every distinct URI (other query parameters, pagination cursors, ...) needs its own token exchange.

When an extension accepts one token for all its resources, share a token per origin instead:

```typescript
createCachingTokenSupplier(tokenExchangeSupplier, { key: uri => new URL(uri).origin });
```

#### `scope` is resolved on every request

The `scope` is resolved for every request, including requests served from the cache, so it should be cheap (e.g. read the current user from memory, not over the network).
When it rejects, the request fails.

#### Invalidating tokens

Call `invalidate(uri, token)` to drop the token for a URI after it was rejected (e.g. on `401 Unauthorized`). Passing the rejected `token` makes sure a token that was obtained in the meantime (e.g. after a concurrent request was rejected too) is kept. Call `clear()` to drop all cached tokens (e.g. on sign-out).
