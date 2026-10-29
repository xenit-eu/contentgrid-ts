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
        // Never hand out a token that was obtained for a different user
        scope: () => currentUser?.sub ?? null,
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
Tokens that can no longer be handed out (expired, or cached for another scope) are removed on the next request, so the cache does not grow over a long session.

| Option         | Default                | Description                                                                                       |
|----------------|------------------------|---------------------------------------------------------------------------------------------------|
| `key`          | the full request URI   | Maps a request URI to a cache key; requests with the same key share a token (e.g. `uri => new URL(uri).origin`) |
| `scope`        | one shared scope       | The scope tokens belong to (e.g. the signed-in user). A `null` scope removes all cached tokens and returns `null` without obtaining a token |
| `expiryMargin` | `30_000`               | Milliseconds before expiry at which a cached token is no longer handed out                          |

Call `invalidate(uri)` to drop the token for a URI after it was rejected (e.g. on `401 Unauthorized`), or `clear()` to drop all cached tokens (e.g. on sign-out).
