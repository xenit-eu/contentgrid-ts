import { createCachingTokenSupplier } from "../../src/token-supplier";
import { AuthenticationToken, AuthenticationTokenSupplier } from "../../src/token-supplier";

const RESOURCE = "https://extension.example/resource?id=1";
const OTHER_RESOURCE = "https://extension.example/other";

/**
 * The cache key of a token for a URI (the scope is part of it)
 */
function cacheKey(uri: string, scope: string | null = null) {
    return JSON.stringify([scope, uri]);
}

const supplierOpts = {
    fetch: jest.fn()
}

function tokenExpiringIn(token: string, expiresIn: number | null): AuthenticationToken {
    return {
        token,
        expiresAt: expiresIn === null ? null : new Date(Date.now() + expiresIn)
    };
}

function sequentialSupplier(...tokens: AuthenticationToken[]) {
    const supplier = jest.fn<Promise<AuthenticationToken | null>, Parameters<AuthenticationTokenSupplier>>();
    for(const token of tokens) {
        supplier.mockResolvedValueOnce(token);
    }
    return supplier;
}

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

test("reuses a token until it is about to expire", async () => {
    const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000), tokenExpiringIn("token-2", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier);

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-1");
    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-1");
    expect(supplier).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(300_000 - 30_000 - 1);
    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-1");

    jest.advanceTimersByTime(1);
    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-2");
    expect(supplier).toHaveBeenCalledTimes(2);
})

test("uses a configurable expiry margin", async () => {
    const supplier = sequentialSupplier(tokenExpiringIn("token-1", 10_000), tokenExpiringIn("token-2", 10_000));
    const cachingSupplier = createCachingTokenSupplier(supplier, { expiryMargin: 0 });

    await cachingSupplier(RESOURCE, supplierOpts);
    jest.advanceTimersByTime(9_999);
    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-1");
    jest.advanceTimersByTime(1);
    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-2");
})

test("caches a separate token per URI by default", async () => {
    const supplier = jest.fn<Promise<AuthenticationToken | null>, Parameters<AuthenticationTokenSupplier>>(async (uri) => tokenExpiringIn(`token for ${uri}`, 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier);

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual(`token for ${RESOURCE}`);
    expect((await cachingSupplier(OTHER_RESOURCE, supplierOpts))?.token).toEqual(`token for ${OTHER_RESOURCE}`);
    expect(supplier).toHaveBeenCalledTimes(2);
})

test("shares a token between URIs with the same URI key", async () => {
    const supplier = sequentialSupplier(tokenExpiringIn("origin-token", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier, { uriKey: uri => new URL(uri).origin });

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("origin-token");
    expect((await cachingSupplier(OTHER_RESOURCE, supplierOpts))?.token).toEqual("origin-token");
    expect(supplier).toHaveBeenCalledTimes(1);
})

test("shares one in-flight call between concurrent requests", async () => {
    const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier);

    const [a, b] = await Promise.all([
        cachingSupplier(RESOURCE, supplierOpts),
        cachingSupplier(RESOURCE, supplierOpts),
    ]);
    expect(a?.token).toEqual("token-1");
    expect(b?.token).toEqual("token-1");
    expect(supplier).toHaveBeenCalledTimes(1);
})

test("does not reuse a token cached for another scope", async () => {
    let user = "user-1";
    const supplier = jest.fn<Promise<AuthenticationToken | null>, Parameters<AuthenticationTokenSupplier>>(async () => tokenExpiringIn(`token for ${user}`, 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier, { scope: () => user });

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token for user-1");
    user = "user-2";
    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token for user-2");
})

test("keeps the tokens of every scope", async () => {
    let user = "user-1";
    const supplier = jest.fn<Promise<AuthenticationToken | null>, Parameters<AuthenticationTokenSupplier>>(async () => tokenExpiringIn(`token for ${user}`, 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier, { scope: () => user });

    await cachingSupplier(RESOURCE, supplierOpts);
    user = "user-2";
    await cachingSupplier(RESOURCE, supplierOpts);
    user = "user-1";

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token for user-1");
    expect(supplier).toHaveBeenCalledTimes(2);
})

test("combines the scope and the URI key", async () => {
    let user = "user-1";
    const supplier = jest.fn<Promise<AuthenticationToken | null>, Parameters<AuthenticationTokenSupplier>>(async () => tokenExpiringIn(`token for ${user}`, 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier, { uriKey: uri => new URL(uri).origin, scope: () => user });

    await cachingSupplier(RESOURCE, supplierOpts);
    expect((await cachingSupplier(OTHER_RESOURCE, supplierOpts))?.token).toEqual("token for user-1");
    user = "user-2";
    expect((await cachingSupplier(OTHER_RESOURCE, supplierOpts))?.token).toEqual("token for user-2");
    expect(supplier).toHaveBeenCalledTimes(2);
})

test("a scope and URI key containing a separator don't share a token", async () => {
    let scope = "a|b";
    const supplier = jest.fn<Promise<AuthenticationToken | null>, Parameters<AuthenticationTokenSupplier>>(async () => tokenExpiringIn(`token for ${scope}`, 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier, { uriKey: uri => uri === RESOURCE ? "c" : "b|c", scope: () => scope });

    await cachingSupplier(RESOURCE, supplierOpts);
    scope = "a";
    expect((await cachingSupplier(OTHER_RESOURCE, supplierOpts))?.token).toEqual("token for a");
})

test("calls the supplier when the scope is null or undefined", async () => {
    let user: string | null | undefined = null;
    const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier, { scope: () => user });

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-1");
    user = undefined;
    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-1");
    expect(supplier).toHaveBeenCalledTimes(1);
})

test("caches a token without expiry until it is invalidated", async () => {
    const supplier = sequentialSupplier(tokenExpiringIn("token-1", null), tokenExpiringIn("token-2", null));
    const cachingSupplier = createCachingTokenSupplier(supplier);

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-1");
    jest.advanceTimersByTime(365 * 24 * 60 * 60 * 1000);
    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-1");
    expect(supplier).toHaveBeenCalledTimes(1);

    cachingSupplier.invalidate(RESOURCE);
    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-2");
})

test("does not cache a null token", async () => {
    const supplier = jest.fn<Promise<AuthenticationToken | null>, Parameters<AuthenticationTokenSupplier>>(async () => null);
    const cachingSupplier = createCachingTokenSupplier(supplier);

    expect(await cachingSupplier(RESOURCE, supplierOpts)).toBeNull();
    expect(await cachingSupplier(RESOURCE, supplierOpts)).toBeNull();
    expect(supplier).toHaveBeenCalledTimes(2);
})

test("does not cache failures", async () => {
    const supplier = sequentialSupplier();
    supplier.mockRejectedValueOnce(new Error("exchange failed"));
    supplier.mockResolvedValueOnce(tokenExpiringIn("token-2", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier);

    await expect(cachingSupplier(RESOURCE, supplierOpts)).rejects.toThrow("exchange failed");
    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-2");
})

test("invalidate() removes the cached token for a URI", async () => {
    const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000), tokenExpiringIn("token-2", 300_000), tokenExpiringIn("token-3", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier);

    await cachingSupplier(RESOURCE, supplierOpts);
    await cachingSupplier(OTHER_RESOURCE, supplierOpts);
    cachingSupplier.invalidate(RESOURCE);

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-3");
    expect((await cachingSupplier(OTHER_RESOURCE, supplierOpts))?.token).toEqual("token-2");
})

test("invalidate() with the rejected token keeps a token obtained in the meantime", async () => {
    const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000), tokenExpiringIn("token-2", 300_000), tokenExpiringIn("token-3", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier);

    await cachingSupplier(RESOURCE, supplierOpts);
    // Two requests with token-1 are rejected; the first invalidation leads to token-2
    cachingSupplier.invalidate(RESOURCE, "token-1");
    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-2");
    cachingSupplier.invalidate(RESOURCE, "token-1");

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-2");
    expect(supplier).toHaveBeenCalledTimes(2);
})

test("invalidate() with a rejected token keeps a token that is still being obtained", async () => {
    let resolveToken!: (token: AuthenticationToken) => void;
    const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000));
    supplier.mockImplementationOnce(() => new Promise(resolve => {
        resolveToken = resolve;
    }));
    const cachingSupplier = createCachingTokenSupplier(supplier);

    await cachingSupplier(RESOURCE, supplierOpts);
    cachingSupplier.invalidate(RESOURCE, "token-1");
    const pending = cachingSupplier(RESOURCE, supplierOpts);
    await Promise.resolve();
    cachingSupplier.invalidate(RESOURCE, "token-1");
    resolveToken(tokenExpiringIn("token-2", 300_000));

    expect((await pending)?.token).toEqual("token-2");
    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-2");
    expect(supplier).toHaveBeenCalledTimes(2);
})

test("does not cache a token with an invalid expiry", async () => {
    const supplier = sequentialSupplier(
        { token: "token-1", expiresAt: new Date(NaN) },
        { token: "token-2", expiresAt: new Date(NaN) }
    );
    const cachingSupplier = createCachingTokenSupplier(supplier);

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-1");
    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-2");
})

test("invalidate() removes the cached tokens for a URI of every scope", async () => {
    let user = "user-1";
    const supplier = jest.fn<Promise<AuthenticationToken | null>, Parameters<AuthenticationTokenSupplier>>(async () => tokenExpiringIn(`token for ${user}`, 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier, { scope: () => user });

    await cachingSupplier(RESOURCE, supplierOpts);
    user = "user-2";
    await cachingSupplier(RESOURCE, supplierOpts);
    cachingSupplier.invalidate(RESOURCE);

    await cachingSupplier(RESOURCE, supplierOpts);
    user = "user-1";
    await cachingSupplier(RESOURCE, supplierOpts);
    expect(supplier).toHaveBeenCalledTimes(4);
})

test("invalidate() with the rejected token only removes that token", async () => {
    let user = "user-1";
    const supplier = jest.fn<Promise<AuthenticationToken | null>, Parameters<AuthenticationTokenSupplier>>(async () => tokenExpiringIn(`token for ${user}`, 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier, { scope: () => user });

    await cachingSupplier(RESOURCE, supplierOpts);
    user = "user-2";
    await cachingSupplier(RESOURCE, supplierOpts);
    cachingSupplier.invalidate(RESOURCE, "token for user-2");

    user = "user-1";
    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token for user-1");
    expect(supplier).toHaveBeenCalledTimes(2);
    user = "user-2";
    await cachingSupplier(RESOURCE, supplierOpts);
    expect(supplier).toHaveBeenCalledTimes(3);
})

test("invalidate() for a URI without cached token does nothing", async () => {
    const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier);

    await cachingSupplier(RESOURCE, supplierOpts);
    cachingSupplier.invalidate(OTHER_RESOURCE, "token-1");

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-1");
    expect(supplier).toHaveBeenCalledTimes(1);
})

test("clear() removes all cached tokens", async () => {
    const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000), tokenExpiringIn("token-2", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier);

    await cachingSupplier(RESOURCE, supplierOpts);
    cachingSupplier.clear();

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-2");
})

test("clear() removes the cached tokens of every scope", async () => {
    let user = "user-1";
    const supplier = jest.fn<Promise<AuthenticationToken | null>, Parameters<AuthenticationTokenSupplier>>(async () => tokenExpiringIn(`token for ${user}`, 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier, { scope: () => user });

    await cachingSupplier(RESOURCE, supplierOpts);
    user = "user-2";
    await cachingSupplier(RESOURCE, supplierOpts);
    cachingSupplier.clear();

    await cachingSupplier(RESOURCE, supplierOpts);
    user = "user-1";
    await cachingSupplier(RESOURCE, supplierOpts);
    expect(supplier).toHaveBeenCalledTimes(4);
    expect(jest.getTimerCount()).toBe(2);
})

test("does not pass a request signal to the shared call", async () => {
    const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier);

    await cachingSupplier(RESOURCE, { ...supplierOpts, signal: new AbortController().signal });

    expect(supplier).toHaveBeenCalledWith(RESOURCE, { fetch: supplierOpts.fetch });
})

test("an aborted request stops waiting without failing other requests", async () => {
    let resolveToken!: (token: AuthenticationToken) => void;
    const supplier = jest.fn<Promise<AuthenticationToken | null>, Parameters<AuthenticationTokenSupplier>>(() => new Promise(resolve => {
        resolveToken = resolve;
    }));
    const cachingSupplier = createCachingTokenSupplier(supplier);
    const abortController = new AbortController();

    const aborted = cachingSupplier(RESOURCE, { ...supplierOpts, signal: abortController.signal });
    const other = cachingSupplier(RESOURCE, supplierOpts);
    await Promise.resolve(); // Let both requests resolve their scope

    abortController.abort(new Error("aborted"));
    await expect(aborted).rejects.toThrow("aborted");

    resolveToken(tokenExpiringIn("token-1", 300_000));
    expect((await other)?.token).toEqual("token-1");
    expect(supplier).toHaveBeenCalledTimes(1);
})

test("a new request does not wait for a call that an aborted request was waiting for", async () => {
    const supplier = jest.fn<Promise<AuthenticationToken | null>, Parameters<AuthenticationTokenSupplier>>()
        .mockImplementationOnce(() => new Promise(() => {})) // Never completes
        .mockResolvedValueOnce(tokenExpiringIn("token-2", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier);
    const abortController = new AbortController();

    const aborted = cachingSupplier(RESOURCE, { ...supplierOpts, signal: abortController.signal });
    await Promise.resolve(); // Let the request resolve its scope
    abortController.abort(new Error("aborted"));
    await expect(aborted).rejects.toThrow("aborted");

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-2");
    expect(supplier).toHaveBeenCalledTimes(2);
})

test("an aborted request does not remove a token that is already cached", async () => {
    const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000), tokenExpiringIn("token-2", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier);
    await cachingSupplier(RESOURCE, supplierOpts);
    const abortController = new AbortController();

    const request = cachingSupplier(RESOURCE, { ...supplierOpts, signal: abortController.signal });
    abortController.abort(new Error("aborted"));
    await request.catch(() => undefined); // Served from the cache or aborted, either is fine

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-1");
    expect(supplier).toHaveBeenCalledTimes(1);
})

test("rejects immediately when the request is already aborted", async () => {
    const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier);
    const abortController = new AbortController();
    abortController.abort(new Error("already aborted"));

    await expect(cachingSupplier(RESOURCE, { ...supplierOpts, signal: abortController.signal })).rejects.toThrow("already aborted");
    expect(supplier).not.toHaveBeenCalled();
})

test("propagates a failure to a request with a signal", async () => {
    const supplier = sequentialSupplier();
    supplier.mockRejectedValueOnce(new Error("exchange failed"));
    const cachingSupplier = createCachingTokenSupplier(supplier);

    await expect(cachingSupplier(RESOURCE, { ...supplierOpts, signal: new AbortController().signal })).rejects.toThrow("exchange failed");
})

describe("removing tokens that can no longer be handed out", () => {
    let mapDelete: jest.SpyInstance;

    beforeEach(() => {
        mapDelete = jest.spyOn(Map.prototype, "delete");
    });

    afterEach(() => {
        mapDelete.mockRestore();
    });

    test("removes a token when it is about to expire, without another request", async () => {
        const supplier = sequentialSupplier(tokenExpiringIn("token-1", 60_000));
        const cachingSupplier = createCachingTokenSupplier(supplier);

        await cachingSupplier(RESOURCE, supplierOpts);
        expect(jest.getTimerCount()).toBe(1);

        jest.advanceTimersByTime(60_000 - 30_000 - 1);
        expect(mapDelete).not.toHaveBeenCalledWith(cacheKey(RESOURCE));

        jest.advanceTimersByTime(1);
        expect(mapDelete).toHaveBeenCalledWith(cacheKey(RESOURCE));
        expect(jest.getTimerCount()).toBe(0);
    })

    test("removes a token cached for a previous scope when its timer fires", async () => {
        let user = "user-1";
        const supplier = sequentialSupplier(tokenExpiringIn("token-1", 60_000), tokenExpiringIn("token-2", 300_000));
        const cachingSupplier = createCachingTokenSupplier(supplier, { scope: () => user });

        await cachingSupplier(RESOURCE, supplierOpts);
        user = "user-2";
        await cachingSupplier(RESOURCE, supplierOpts);
        jest.advanceTimersByTime(30_000);

        expect(mapDelete).toHaveBeenCalledWith(cacheKey(RESOURCE, "user-1"));
        expect(mapDelete).not.toHaveBeenCalledWith(cacheKey(RESOURCE, "user-2"));
    })

    test("keeps a token without expiry without a timer", async () => {
        const supplier = sequentialSupplier(tokenExpiringIn("token-1", null));
        const cachingSupplier = createCachingTokenSupplier(supplier);

        await cachingSupplier(RESOURCE, supplierOpts);

        expect(mapDelete).not.toHaveBeenCalledWith(cacheKey(RESOURCE));
        expect(jest.getTimerCount()).toBe(0);
    })

    test("does not keep a token that is already within the expiry margin", async () => {
        const supplier = sequentialSupplier(tokenExpiringIn("token-1", 10_000), tokenExpiringIn("token-2", 10_000));
        const cachingSupplier = createCachingTokenSupplier(supplier);

        expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-1");

        expect(mapDelete).toHaveBeenCalledWith(cacheKey(RESOURCE));
        expect(jest.getTimerCount()).toBe(0);
        expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-2");
    })
})

describe("expiry timers", () => {
    test("invalidate() and clear() stop the timers of the removed tokens", async () => {
        const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000), tokenExpiringIn("token-2", 300_000));
        const cachingSupplier = createCachingTokenSupplier(supplier);

        await cachingSupplier(RESOURCE, supplierOpts);
        await cachingSupplier(OTHER_RESOURCE, supplierOpts);
        expect(jest.getTimerCount()).toBe(2);

        cachingSupplier.invalidate(RESOURCE);
        expect(jest.getTimerCount()).toBe(1);

        cachingSupplier.clear();
        expect(jest.getTimerCount()).toBe(0);
    })

    test("does not hand out an expired token when its timer was delayed", async () => {
        const supplier = sequentialSupplier(tokenExpiringIn("token-1", 60_000), tokenExpiringIn("token-2", 60_000));
        const cachingSupplier = createCachingTokenSupplier(supplier);

        await cachingSupplier(RESOURCE, supplierOpts);
        // Time passes without the timer firing, like in a throttled background tab
        jest.setSystemTime(Date.now() + 60_000);

        expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-2");
    })

    test("does not keep a Node.js process alive", async () => {
        jest.useRealTimers();
        const unref = jest.spyOn(setTimeout(() => {}, 0).constructor.prototype, "unref");
        const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000));
        const cachingSupplier = createCachingTokenSupplier(supplier);

        await cachingSupplier(RESOURCE, supplierOpts);

        expect(unref).toHaveBeenCalledTimes(1);
        cachingSupplier.clear();
        unref.mockRestore();
    })
})
