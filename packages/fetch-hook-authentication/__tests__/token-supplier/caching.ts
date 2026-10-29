import { createCachingTokenSupplier } from "../../src/token-supplier";
import { AuthenticationToken, AuthenticationTokenSupplier } from "../../src/token-supplier";

const RESOURCE = "https://extension.example/resource?id=1";
const OTHER_RESOURCE = "https://extension.example/other";

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

test("shares a token between URIs with the same key", async () => {
    const supplier = sequentialSupplier(tokenExpiringIn("origin-token", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier, { key: uri => new URL(uri).origin });

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

test("returns null without calling the supplier when the scope is null", async () => {
    const supplier = sequentialSupplier();
    const cachingSupplier = createCachingTokenSupplier(supplier, { scope: () => null });

    expect(await cachingSupplier(RESOURCE, supplierOpts)).toBeNull();
    expect(supplier).not.toHaveBeenCalled();
})

test("does not cache tokens without expiry", async () => {
    const supplier = sequentialSupplier(tokenExpiringIn("token-1", null), tokenExpiringIn("token-2", null));
    const cachingSupplier = createCachingTokenSupplier(supplier);

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-1");
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

test("does not pass the request signal to the shared call", async () => {
    const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier);
    const requestSignal = new AbortController().signal;

    await cachingSupplier(RESOURCE, { ...supplierOpts, signal: requestSignal });

    expect(supplier).toHaveBeenCalledWith(RESOURCE, { fetch: supplierOpts.fetch, signal: expect.any(AbortSignal) });
    expect(supplier.mock.calls[0]![1].signal).not.toBe(requestSignal);
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

    expect(supplier.mock.calls[0]![1].signal?.aborted).toBe(false);

    resolveToken(tokenExpiringIn("token-1", 300_000));
    expect((await other)?.token).toEqual("token-1");
    expect(supplier).toHaveBeenCalledTimes(1);
})

test("aborts and forgets the shared call once every waiting request is aborted", async () => {
    const supplier = jest.fn<Promise<AuthenticationToken | null>, Parameters<AuthenticationTokenSupplier>>()
        .mockImplementationOnce(() => new Promise(() => {})) // Never completes
        .mockResolvedValueOnce(tokenExpiringIn("token-2", 300_000));
    const cachingSupplier = createCachingTokenSupplier(supplier);
    const first = new AbortController();
    const second = new AbortController();

    const requests = [
        cachingSupplier(RESOURCE, { ...supplierOpts, signal: first.signal }),
        cachingSupplier(RESOURCE, { ...supplierOpts, signal: second.signal }),
    ];
    await Promise.resolve(); // Let both requests resolve their scope
    const sharedSignal = supplier.mock.calls[0]![1].signal!;

    first.abort(new Error("first aborted"));
    await expect(requests[0]).rejects.toThrow("first aborted");
    expect(sharedSignal.aborted).toBe(false);

    second.abort(new Error("second aborted"));
    await expect(requests[1]).rejects.toThrow("second aborted");
    expect(sharedSignal.aborted).toBe(true);

    expect((await cachingSupplier(RESOURCE, supplierOpts))?.token).toEqual("token-2");
    expect(supplier).toHaveBeenCalledTimes(2);
})

test("keeps the shared call while a request without signal is waiting for it", async () => {
    let resolveToken!: (token: AuthenticationToken) => void;
    const supplier = jest.fn<Promise<AuthenticationToken | null>, Parameters<AuthenticationTokenSupplier>>(() => new Promise(resolve => {
        resolveToken = resolve;
    }));
    const cachingSupplier = createCachingTokenSupplier(supplier);
    const abortController = new AbortController();

    const aborted = cachingSupplier(RESOURCE, { ...supplierOpts, signal: abortController.signal });
    const withoutSignal = cachingSupplier(RESOURCE, supplierOpts);
    await Promise.resolve();
    abortController.abort(new Error("aborted"));
    await expect(aborted).rejects.toThrow("aborted");

    expect(supplier.mock.calls[0]![1].signal?.aborted).toBe(false);
    resolveToken(tokenExpiringIn("token-1", 300_000));
    expect((await withoutSignal)?.token).toEqual("token-1");
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

    test("removes expired tokens for other keys on the next request", async () => {
        const supplier = sequentialSupplier(tokenExpiringIn("token-1", 60_000), tokenExpiringIn("token-2", 300_000));
        const cachingSupplier = createCachingTokenSupplier(supplier);

        await cachingSupplier(RESOURCE, supplierOpts);
        jest.advanceTimersByTime(60_000);
        await cachingSupplier(OTHER_RESOURCE, supplierOpts);

        expect(mapDelete).toHaveBeenCalledWith(RESOURCE);
        expect(mapDelete).not.toHaveBeenCalledWith(OTHER_RESOURCE);
    })

    test("removes tokens cached for another scope on the next request", async () => {
        let user = "user-1";
        const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000), tokenExpiringIn("token-2", 300_000));
        const cachingSupplier = createCachingTokenSupplier(supplier, { scope: () => user });

        await cachingSupplier(RESOURCE, supplierOpts);
        user = "user-2";
        await cachingSupplier(OTHER_RESOURCE, supplierOpts);

        expect(mapDelete).toHaveBeenCalledWith(RESOURCE);
    })

    test("removes all tokens when the scope becomes null", async () => {
        let user: string | null = "user-1";
        const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000), tokenExpiringIn("token-2", 300_000));
        const cachingSupplier = createCachingTokenSupplier(supplier, { scope: () => user });

        await cachingSupplier(RESOURCE, supplierOpts);
        await cachingSupplier(OTHER_RESOURCE, supplierOpts);
        user = null;
        expect(await cachingSupplier(RESOURCE, supplierOpts)).toBeNull();

        expect(mapDelete).toHaveBeenCalledWith(RESOURCE);
        expect(mapDelete).toHaveBeenCalledWith(OTHER_RESOURCE);
    })

    test("does not keep a token without expiry", async () => {
        const supplier = sequentialSupplier(tokenExpiringIn("token-1", null));
        const cachingSupplier = createCachingTokenSupplier(supplier);

        await cachingSupplier(RESOURCE, supplierOpts);

        expect(mapDelete).toHaveBeenCalledWith(RESOURCE);
    })
})

describe("browsers without AbortSignal#reason and AbortSignal#throwIfAborted", () => {
    function legacyAbortSignal(aborted: boolean) {
        const target = new EventTarget() as EventTarget & { aborted: boolean };
        target.aborted = aborted;
        return target as unknown as AbortSignal;
    }

    test("rejects with an AbortError when already aborted", async () => {
        const supplier = sequentialSupplier(tokenExpiringIn("token-1", 300_000));
        const cachingSupplier = createCachingTokenSupplier(supplier);

        await expect(cachingSupplier(RESOURCE, { ...supplierOpts, signal: legacyAbortSignal(true) })).rejects.toMatchObject({ name: "AbortError" });
        expect(supplier).not.toHaveBeenCalled();
    })

    test("rejects with an AbortError when aborted while waiting", async () => {
        const supplier = jest.fn<Promise<AuthenticationToken | null>, Parameters<AuthenticationTokenSupplier>>(() => new Promise(() => {}));
        const cachingSupplier = createCachingTokenSupplier(supplier);
        const signal = legacyAbortSignal(false);

        const request = cachingSupplier(RESOURCE, { ...supplierOpts, signal });
        await Promise.resolve(); // Let the request resolve its scope
        (signal as unknown as { aborted: boolean }).aborted = true;
        signal.dispatchEvent(new Event("abort"));

        await expect(request).rejects.toMatchObject({ name: "AbortError" });
    })
})
