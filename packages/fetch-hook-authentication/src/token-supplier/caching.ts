import { ValueProvider, ValueProviderResolver } from "@contentgrid/fetch-hooks/value-provider";
import { AuthenticationToken, AuthenticationTokenSupplier } from "./types";

export interface CachingTokenSupplierOptions {
    /**
     * Determines which URIs share a cached token: requests for URIs that map to the same key (within the same {@link CachingTokenSupplierOptions#scope}) use the same token.
     *
     * Defaults to the full URI, so a token is only reused for exactly the resource it was obtained for.
     * This is the safe choice for the ContentGrid token exchange, where the decision to issue a token can depend on the exact resource (path and query).
     * Every distinct URI (e.g. with different query parameters) then needs its own token.
     *
     * To reuse a token for all URIs on the same origin, use `uri => new URL(uri).origin`.
     */
    uriKey?: (uri: string) => string;

    /**
     * The scope the cached tokens belong to (e.g. the identity of the signed-in user, `currentUser?.sub`).
     *
     * The scope is part of the cache key, so a token cached for one scope is never handed out for another scope.
     * Tokens cached for a previous scope are not removed when the scope changes; they are removed once they expire.
     * Call {@link CachingTokenSupplier#clear} to remove them immediately (e.g. on sign-out).
     *
     * The scope is resolved for every request, including requests that are served from the cache,
     * so it should be cheap (e.g. read the current user from memory, not from a network call).
     * When it rejects, the request fails.
     *
     * Defaults to a single, shared scope.
     */
    scope?: ValueProvider<string | null | undefined, []>;

    /**
     * Time (in milliseconds) before its expiry at which a cached token is no longer handed out, so it does not expire in flight.
     *
     * Defaults to 30 seconds.
     */
    expiryMargin?: number;
}

/**
 * An {@link AuthenticationTokenSupplier} that caches the tokens it supplies
 */
export type CachingTokenSupplier = AuthenticationTokenSupplier & {
    /**
     * Removes the cached token for a URI, so the next request obtains a new token
     *
     * Use this when the token was rejected by the resource (e.g. a `401 Unauthorized` response).
     *
     * @param uri - The URI the token was used for
     * @param token - The rejected token. When given, only a cached token that is still this token is removed,
     *   so a token that was obtained in the meantime (e.g. by a concurrent request) is kept.
     *   When omitted, the cached tokens for the URI are removed for every scope.
     */
    invalidate(uri: string, token?: string): void;
    /**
     * Removes all cached tokens, for every scope
     *
     * Call this when the signed-in user signs out or changes, so their tokens don't stay in memory until they expire.
     */
    clear(): void;
};

interface CacheEntry {
    /**
     * The key of the URI the token was obtained for, without the scope
     */
    readonly uriKey: string;
    readonly token: Promise<AuthenticationToken | null>;
    settled: boolean;
    value: AuthenticationToken | null;
    /**
     * Removes the entry once its token can no longer be handed out
     */
    timer?: ReturnType<typeof setTimeout>;
}

const DEFAULT_EXPIRY_MARGIN = 30_000;

/**
 * Creates a token supplier that keeps the tokens supplied by another token supplier in memory, until they are about to expire.
 *
 * - A cached token is reused for requests with the same {@link CachingTokenSupplierOptions#uriKey} and {@link CachingTokenSupplierOptions#scope},
 *   until it is within {@link CachingTokenSupplierOptions#expiryMargin} of its expiry; the next request then obtains a new token.
 *   A token that is valid for less than `expiryMargin` is therefore handed out once, but never reused.
 * - Tokens without (valid) expiry, `null` tokens and failures are not cached.
 *   A missing expiry means the expiry is unknown, not that the token never expires (RFC 6749, section 5.1).
 * - A cached token is removed from memory by a timer once it can no longer be handed out, so the cache does not grow over a long session.
 *   Timers are not exact (e.g. browsers delay them in background tabs), so the expiry is checked again whenever a cached token is requested.
 * - Concurrent requests for the same key share a single call to the wrapped token supplier.
 *   That call is not aborted when a request is aborted: the aborted request only stops waiting for it.
 *   The call is then no longer shared with new requests, so a call that never completes does not block its key.
 *
 * @param supplier - The token supplier to obtain tokens from
 * @param options - Caching options
 */
export default function createCachingTokenSupplier(supplier: AuthenticationTokenSupplier, options: CachingTokenSupplierOptions = {}): CachingTokenSupplier {
    const uriKey = options.uriKey ?? (uri => uri);
    const scopeResolver = ValueProviderResolver.fromValueProvider(options.scope);
    const expiryMargin = options.expiryMargin ?? DEFAULT_EXPIRY_MARGIN;
    const entries = new Map<string, CacheEntry>();

    /**
     * Milliseconds until a settled entry's token can no longer be handed out,
     * or `0` for a token that can't be cached (`null`, or without (valid) expiry)
     */
    function remainingTime(entry: CacheEntry): number {
        const expiresAt = entry.value?.expiresAt?.getTime() ?? NaN;
        return isNaN(expiresAt) ? 0 : expiresAt - expiryMargin - Date.now();
    }

    function isUsable(entry: CacheEntry): boolean {
        if(!entry.settled) {
            return true; // Still in flight, share it
        }
        return remainingTime(entry) > 0;
    }

    function remove(cacheKey: string, entry: CacheEntry) {
        clearTimeout(entry.timer);
        if(entries.get(cacheKey) === entry) {
            entries.delete(cacheKey);
        }
    }

    function scheduleRemoval(cacheKey: string, entry: CacheEntry) {
        const remaining = remainingTime(entry);
        if(remaining <= 0) {
            remove(cacheKey, entry); // Not cacheable, or already too close to its expiry
            return;
        }
        entry.timer = setTimeout(() => remove(cacheKey, entry), remaining);
        // Don't keep a Node.js process alive just to clean up the cache
        // A number in browsers; asserted (not annotated), so TypeScript does not narrow it to the type of the current environment
        const timer = entry.timer as { unref?: () => void } | number;
        if(typeof timer === "object") {
            timer.unref?.();
        }
    }

    function removeAll() {
        for(const [cacheKey, entry] of entries) {
            remove(cacheKey, entry);
        }
    }

    function createEntry(cacheKey: string, uri: string, fetch: typeof globalThis.fetch): CacheEntry {
        const entry: CacheEntry = {
            uriKey: uriKey(uri),
            // Shared between requests, so it doesn't get the signal of a single request
            token: supplier(uri, { fetch }),
            settled: false,
            value: null,
        };
        entry.token.then(
            token => {
                entry.settled = true;
                entry.value = token;
                if(entries.get(cacheKey) === entry) {
                    scheduleRemoval(cacheKey, entry);
                }
            },
            () => remove(cacheKey, entry)
        );
        entries.set(cacheKey, entry);
        return entry;
    }

    function waitFor(cacheKey: string, entry: CacheEntry, signal: AbortSignal | undefined): Promise<AuthenticationToken | null> {
        if(!signal) {
            return entry.token;
        }
        return new Promise((resolve, reject) => {
            const onAbort = () => {
                if(!entry.settled) {
                    // Don't share a call that may never complete with new requests; they start a new call instead
                    remove(cacheKey, entry);
                }
                reject(signal.reason);
            };
            signal.addEventListener("abort", onAbort, { once: true });
            entry.token
                .then(resolve, reject)
                .finally(() => signal.removeEventListener("abort", onAbort));
        });
    }

    const cachingSupplier: AuthenticationTokenSupplier = async (uri, opts) => {
        const scope = await scopeResolver.resolve();
        opts.signal?.throwIfAborted();

        // JSON, so a scope and URI key containing the same separator can't map to the same cache key
        const cacheKey = JSON.stringify([scope ?? null, uriKey(uri)]);
        let entry = entries.get(cacheKey);
        if(entry !== undefined && !isUsable(entry)) {
            remove(cacheKey, entry);
            entry = undefined;
        }
        entry ??= createEntry(cacheKey, uri, opts.fetch);
        return waitFor(cacheKey, entry, opts.signal);
    };

    return Object.assign(cachingSupplier, {
        invalidate(uri: string, token?: string) {
            const invalidatedUriKey = uriKey(uri);
            for(const [cacheKey, entry] of entries) {
                if(entry.uriKey !== invalidatedUriKey) {
                    continue;
                }
                // An entry that is still in flight was created after the rejected token was handed out
                if(token === undefined || (entry.settled && entry.value?.token === token)) {
                    remove(cacheKey, entry);
                }
            }
        },
        clear() {
            removeAll();
        },
    });
}
