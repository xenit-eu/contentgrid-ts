import createBearerAuthenticationHook from "../src"

test("injects authorization header when token supplied", async () => {
    const hook = createBearerAuthenticationHook({
        tokenSupplier: async (uri) => ({ token: "token-" + uri, expiresAt: null })
    });

    const fakeFetch = jest.fn(async (..._args: Parameters<typeof fetch>) => new Response("", { status: 200 }));

    const hookedFetch = hook(fakeFetch);

    await hookedFetch("http://example.com/xyz");

    const request = fakeFetch.mock.lastCall?.[0] as Request;

    expect(request).toBeInstanceOf(Request)
    expect(request.headers.get("authorization")).toEqual("Bearer token-http://example.com/xyz")

});

test("ignores authorization header when notoken supplied", async () => {
    const hook = createBearerAuthenticationHook({
        tokenSupplier: async () => null
    });

    const fakeFetch = jest.fn(async (..._args: Parameters<typeof fetch>) => new Response("", { status: 200 }));

    const hookedFetch = hook(fakeFetch);

    await hookedFetch("http://example.com/xyz");

    const request = fakeFetch.mock.lastCall?.[0] as Request;

    expect(request).toBeInstanceOf(Request)
    expect(request.headers.has("authorization")).toBeFalse();

});
