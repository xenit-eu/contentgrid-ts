import { ValueProvider, ValueProviderResolver } from "@contentgrid/fetch-hooks/value-provider";
import { AuthenticationToken, AuthenticationTokenSupplier } from "./types";

export interface CachingTokenSupplierOptions {
    /**
     * Determines which requests share a cached token: requests for URIs that map to the same key use the same token.
     *
     * Defaults to the full URI, so a token is only reused for exactly the resource it was obtained for.
     * This is the safe choice for the ContentGrid token exchange, where the decision to issue a token can depend on the exact resource (path and query).
     * Every distinct URI (e.g. with different query parameters) then needs its own token.
     *
     * To reuse a token for all URIs on the same origin, use `uri => new URL(uri).origin`.
     */
    key?: (uri: string) => string;

    /**
     * The scope the cached tokens belong to (e.g. the identity of the signed-in user).
     *
     * A token cached for one scope is never handed out for another scope.
     * When the scope resolves to `null` (e.g. nobody is signed in), all cached tokens are removed, no token is obtained and `null` is returned.
     *
     * The scope is resolved for every request, including requests that are served from the cache,
     * so it should be cheap (e.g. read the current user from memory, not from a network call).
     * When it rejects, the request fails.
     *
     * Defaults to a single, shared scope.
     */
    scope?: ValueProvider<string | null, []>;

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
     * @param token - The rejected token. When given, the cached token is only removed if it is still this token,
     *   so a token that was obtained in the meantime (e.g. by a concurrent request that was also rejected) is kept.
     */
    invalidate(uri: string, token?: string): void;
    /**
     * Removes all cached tokens
     */
    clear(): void;
};

interface CacheEntry {
    readonly scope: string;
    readonly token: Promise<AuthenticationToken | null>;
    /**
     * Aborts the call to the wrapped token supplier, once no request is waiting for it anymore
     */
    readonly controller: AbortController;
    /**
     * Number of requests waiting for {@link token}
     */
    waiters: number;
    settled: boolean;
    value: AuthenticationToken | null;
    /**
     * Removes the entry once its token can no longer be handed out
     */
    timer?: ReturnType<typeof setTimeout>;
}

const DEFAULT_EXPIRY_MARGIN = 30_000;
const DEFAULT_SCOPE = "";
/**
 * Longest delay `setTimeout` supports; a longer delay fires immediately
 */
const MAX_TIMEOUT = 2 ** 31 - 1;

/**
 * The reason a signal was aborted with.
 *
 * Browsers without `AbortSignal#reason` (e.g. Safari < 15.4) get a generic `AbortError` instead.
 */
function abortReason(signal: AbortSignal): unknown {
    return signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
}

/**
 * The expiry of a token, or `null` when it has none, or an invalid one (e.g. from a non-numeric `expires_in`)
 */
function expiryOf(token: AuthenticationToken | null): Date | null {
    const expiresAt = token?.expiresAt ?? null;
    return expiresAt !== null && !isNaN(expiresAt.getTime()) ? expiresAt : null;
}

/**
 * Creates a token supplier that keeps the tokens supplied by another token supplier in memory, until they are about to expire.
 *
 * - A cached token is reused for requests with the same {@link CachingTokenSupplierOptions#key} and {@link CachingTokenSupplierOptions#scope},
 *   until it is within {@link CachingTokenSupplierOptions#expiryMargin} of its expiry; the next request then obtains a new token.
 *   A token that is valid for less than `expiryMargin` is therefore handed out once, but never reused.
 * - Tokens without (valid) expiry and failures are not cached.
 * - A cached token is removed from memory by a timer once it can no longer be handed out, so the cache does not grow over a long session.
 *   Timers are not exact (e.g. browsers delay them in background tabs), so the expiry is checked again whenever a cached token is requested.
 * - A token cached for another scope is never handed out; it is replaced when its key is requested, or removed by its timer.
 * - Concurrent requests for the same key share a single call to the wrapped token supplier.
 *   An aborted request only stops waiting for that call; the call itself is aborted (and not cached) once every request waiting for it is aborted.
 *
 * @param supplier - The token supplier to obtain tokens from
 * @param options - Caching options
 */
export default function createCachingTokenSupplier(supplier: AuthenticationTokenSupplier, options: CachingTokenSupplierOptions = {}): CachingTokenSupplier {
    const key = options.key ?? (uri => uri);
    const scopeResolver = ValueProviderResolver.fromValueProvider(options.scope ?? DEFAULT_SCOPE);
    const expiryMargin = options.expiryMargin ?? DEFAULT_EXPIRY_MARGIN;
    const entries = new Map<string, CacheEntry>();

    /**
     * Milliseconds until a settled entry's token can no longer be handed out, or `null` when it has no (valid) expiry
     */
    function remainingTime(entry: CacheEntry): number | null {
        const expiresAt = expiryOf(entry.value);
        return expiresAt === null ? null : expiresAt.getTime() - expiryMargin - Date.now();
    }

    function isUsable(entry: CacheEntry, scope: string): boolean {
        if(entry.scope !== scope) {
            return false;
        }
        if(!entry.settled) {
            return true; // Still in flight, share it
        }
        const remaining = remainingTime(entry);
        return remaining !== null && remaining > 0;
    }

    function remove(cacheKey: string, entry: CacheEntry) {
        clearTimeout(entry.timer);
        if(entries.get(cacheKey) === entry) {
            entries.delete(cacheKey);
        }
    }

    function scheduleRemoval(cacheKey: string, entry: CacheEntry) {
        const remaining = remainingTime(entry);
        if(remaining === null || remaining <= 0) {
            remove(cacheKey, entry); // Not cacheable, or already too close to its expiry
            return;
        }
        // A delay that does not fit in a timer is split up: the timer is scheduled again when it fires too early
        entry.timer = setTimeout(() => scheduleRemoval(cacheKey, entry), Math.min(remaining, MAX_TIMEOUT));
        // Don't keep a Node.js process alive just to clean up the cache
        const timer: { unref?: () => void } | number = entry.timer;
        if(typeof timer === "object") {
            timer.unref?.();
        }
    }

    function removeAll() {
        for(const [cacheKey, entry] of entries) {
            remove(cacheKey, entry);
        }
    }

    function createEntry(cacheKey: string, uri: string, scope: string, fetch: typeof globalThis.fetch): CacheEntry {
        const controller = new AbortController();
        const entry: CacheEntry = {
            scope,
            token: supplier(uri, { fetch, signal: controller.signal }),
            controller,
            waiters: 0,
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
        entry.waiters++;
        let waiting = true;
        const stopWaiting = () => {
            if(waiting) {
                waiting = false;
                entry.waiters--;
                signal?.removeEventListener("abort", onAbort);
            }
        };
        let onAbort: () => void;
        return new Promise((resolve, reject) => {
            onAbort = () => {
                stopWaiting();
                if(entry.waiters === 0 && !entry.settled) {
                    // Nobody is waiting for this call anymore; don't let a call that never completes block this key
                    remove(cacheKey, entry);
                    entry.controller.abort();
                }
                reject(abortReason(signal!));
            };
            signal?.addEventListener("abort", onAbort, { once: true });
            entry.token.then(
                value => {
                    stopWaiting();
                    resolve(value);
                },
                error => {
                    stopWaiting();
                    reject(error);
                }
            );
        });
    }

    const cachingSupplier: AuthenticationTokenSupplier = async (uri, opts) => {
        const scope = await scopeResolver.resolve();
        if(scope === null) {
            removeAll();
            return null;
        }
        // Not AbortSignal#throwIfAborted(), which is not available in all supported browsers
        if(opts.signal?.aborted) {
            throw abortReason(opts.signal);
        }

        const cacheKey = key(uri);
        let entry = entries.get(cacheKey);
        if(entry !== undefined && !isUsable(entry, scope)) {
            remove(cacheKey, entry);
            entry = undefined;
        }
        entry ??= createEntry(cacheKey, uri, scope, opts.fetch);
        return waitFor(cacheKey, entry, opts.signal);
    };

    return Object.assign(cachingSupplier, {
        invalidate(uri: string, token?: string) {
            const cacheKey = key(uri);
            const entry = entries.get(cacheKey);
            if(!entry) {
                return;
            }
            // An entry that is still in flight was created after the rejected token was handed out
            if(token === undefined || (entry.settled && entry.value?.token === token)) {
                remove(cacheKey, entry);
            }
        },
        clear() {
            removeAll();
        },
    });
}
