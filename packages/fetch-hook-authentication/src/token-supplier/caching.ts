import { ValueProvider, ValueProviderResolver } from "@contentgrid/fetch-hooks/value-provider";
import { AuthenticationToken, AuthenticationTokenSupplier } from "./types";

export interface CachingTokenSupplierOptions {
    /**
     * Determines which requests share a cached token: requests for URIs that map to the same key use the same token.
     *
     * Defaults to the full URI, so a token is only reused for exactly the resource it was obtained for.
     */
    key?: (uri: string) => string;

    /**
     * The scope the cached tokens belong to (e.g. the identity of the signed-in user).
     *
     * A token cached for one scope is never handed out for another scope.
     * When the scope resolves to `null`, no token is obtained and `null` is returned.
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
     * Use this when the token was rejected by the resource (e.g. a `401 Unauthorized` response)
     */
    invalidate(uri: string): void;
    /**
     * Removes all cached tokens
     */
    clear(): void;
};

interface CacheEntry {
    readonly scope: string | null;
    readonly token: Promise<AuthenticationToken | null>;
    settled: boolean;
    expiresAt: Date | null;
}

const DEFAULT_EXPIRY_MARGIN = 30_000;
const DEFAULT_SCOPE = "";

function raceAbort<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
    if(!signal) {
        return promise;
    }
    signal.throwIfAborted();
    return new Promise<T>((resolve, reject) => {
        const onAbort = () => reject(signal.reason);
        signal.addEventListener("abort", onAbort, { once: true });
        promise.then(
            value => {
                signal.removeEventListener("abort", onAbort);
                resolve(value);
            },
            error => {
                signal.removeEventListener("abort", onAbort);
                reject(error);
            }
        );
    });
}

/**
 * Creates a token supplier that keeps the tokens supplied by another token supplier in memory, until they are about to expire.
 *
 * - A cached token is reused for requests with the same {@link CachingTokenSupplierOptions#key} and {@link CachingTokenSupplierOptions#scope},
 *   until it is within {@link CachingTokenSupplierOptions#expiryMargin} of its expiry; the next request then obtains a new token.
 * - Tokens without an expiry and failures are not cached.
 * - Concurrent requests for the same key share a single call to the wrapped token supplier.
 *   That call is not aborted when one of the requests is aborted; an aborted request only stops waiting for it.
 *
 * @param supplier - The token supplier to obtain tokens from
 * @param options - Caching options
 */
export default function createCachingTokenSupplier(supplier: AuthenticationTokenSupplier, options: CachingTokenSupplierOptions = {}): CachingTokenSupplier {
    const key = options.key ?? (uri => uri);
    const scopeResolver = ValueProviderResolver.fromValueProvider(options.scope ?? DEFAULT_SCOPE);
    const expiryMargin = options.expiryMargin ?? DEFAULT_EXPIRY_MARGIN;
    const entries = new Map<string, CacheEntry>();

    function isUsable(entry: CacheEntry, scope: string): boolean {
        if(entry.scope !== scope) {
            return false;
        }
        if(!entry.settled) {
            return true; // Still in flight, share it
        }
        return entry.expiresAt !== null && entry.expiresAt.getTime() - expiryMargin > Date.now();
    }

    const cachingSupplier: AuthenticationTokenSupplier = async (uri, opts) => {
        const scope = await scopeResolver.resolve();
        if(scope === null) {
            return null;
        }

        const cacheKey = key(uri);
        let entry = entries.get(cacheKey);
        if(!entry || !isUsable(entry, scope)) {
            const created: CacheEntry = {
                scope,
                token: supplier(uri, { fetch: opts.fetch }),
                settled: false,
                expiresAt: null,
            };
            created.token.then(
                token => {
                    created.settled = true;
                    created.expiresAt = token?.expiresAt ?? null;
                },
                () => {
                    if(entries.get(cacheKey) === created) {
                        entries.delete(cacheKey);
                    }
                }
            );
            entries.set(cacheKey, created);
            entry = created;
        }

        return raceAbort(entry.token, opts.signal);
    };

    return Object.assign(cachingSupplier, {
        invalidate(uri: string) {
            entries.delete(key(uri));
        },
        clear() {
            entries.clear();
        },
    });
}
