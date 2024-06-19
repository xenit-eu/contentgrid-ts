import { createContentgridTokenExchangeTokenSupplier } from "../../src/token-supplier";
import { OAuth2AuthenticationError, TokenExchangeProtocolViolationError } from "../../src/token-supplier/contentgridTokenExchange";

test("successful token exchange", async () => {
    const fakeFetch = jest.fn(async () => new Response(JSON.stringify({
        access_token: "my-access-token",
        token_type: "BeaRer", // should be case-insensitive match
        expires_in: 135
    }), {
        status: 200,
        headers: {
            "content-type": "application/json"
        }
    }));

    const tokenSupplier = createContentgridTokenExchangeTokenSupplier({
        exchangeUrl: "https://extensions.contentgrid.example/exchange/token",
        fetch: fakeFetch
    });

    const token = await tokenSupplier("https://example.com/xyz");
    expect(token?.token).toEqual("my-access-token");
    expect(token?.expiresAt).toBeBetween(new Date(Date.now() + 134_000), new Date(Date.now() + 135_000));
})

test("successful token exchange without expiry", async () => {
    const fakeFetch = jest.fn(async () => new Response(JSON.stringify({
        access_token: "my-access-token",
        token_type: "BeaRer", // should be case-insensitive match
    }), {
        status: 200,
        headers: {
            "content-type": "application/json"
        }
    }));

    const tokenSupplier = createContentgridTokenExchangeTokenSupplier({
        exchangeUrl: "https://extensions.contentgrid.example/exchange/token",
        fetch: fakeFetch
    });

    const token = await tokenSupplier("https://example.com/xyz");
    expect(token?.token).toEqual("my-access-token");
    expect(token?.expiresAt).toBeNull();
})

test("successful token exchange without token_type parameter", async () => {
    const fakeFetch = jest.fn(async () => new Response(JSON.stringify({
        access_token: "my-access-token"
    }), {
        status: 200,
        headers: {
            "content-type": "application/json"
        }
    }));

    const tokenSupplier = createContentgridTokenExchangeTokenSupplier({
        exchangeUrl: "https://extensions.contentgrid.example/exchange/token",
        fetch: fakeFetch
    });

    expect(tokenSupplier("https://example.com/xyz")).rejects.toBeInstanceOf(TokenExchangeProtocolViolationError);
})

test("successful token exchange without access_token parameter", async () => {
    const fakeFetch = jest.fn(async () => new Response(JSON.stringify({
        token_type: "BeaRer", // should be case-insensitive match
    }), {
        status: 200,
        headers: {
            "content-type": "application/json"
        }
    }));

    const tokenSupplier = createContentgridTokenExchangeTokenSupplier({
        exchangeUrl: "https://extensions.contentgrid.example/exchange/token",
        fetch: fakeFetch
    });

    expect(tokenSupplier("https://example.com/xyz")).rejects.toBeInstanceOf(TokenExchangeProtocolViolationError);
})

test("successful token exchange with unsupported token_type", async () => {
    const fakeFetch = jest.fn(async () => new Response(JSON.stringify({
        access_token: "my-access-token",
        token_type: "mac",
        expires_in: 135
    }), {
        status: 200,
        headers: {
            "content-type": "application/json"
        }
    }));

    const tokenSupplier = createContentgridTokenExchangeTokenSupplier({
        exchangeUrl: "https://extensions.contentgrid.example/exchange/token",
        fetch: fakeFetch
    });

    expect(tokenSupplier("https://example.com/xyz")).rejects.toBeInstanceOf(TokenExchangeProtocolViolationError);
})

test("successful token exchange with non-json response", async () => {
    const fakeFetch = jest.fn(async () => new Response("", {
        status: 200,
    }));

    const tokenSupplier = createContentgridTokenExchangeTokenSupplier({
        exchangeUrl: "https://extensions.contentgrid.example/exchange/token",
        fetch: fakeFetch
    });

    expect(tokenSupplier("https://example.com/xyz")).rejects.toBeInstanceOf(TokenExchangeProtocolViolationError);
})

test("failed token exchange with OAuth error", async () => {
    const fakeFetch = jest.fn(async () => new Response(JSON.stringify({
        error: "invalid_request",
        error_description: "You did something wrong"

    }), {
        status: 400,
        headers: {
            "content-type": "application/json"
        }
    }));

    const tokenSupplier = createContentgridTokenExchangeTokenSupplier({
        exchangeUrl: "https://extensions.contentgrid.example/exchange/token",
        fetch: fakeFetch
    });

    expect(tokenSupplier("https://example.com/xyz")).rejects.toEqual(new OAuth2AuthenticationError("invalid_request", "You did something wrong"));
})

test("failed token exchange with non-OAuth JSON error", async () => {
    const fakeFetch = jest.fn(async () => new Response("{}", {
        status: 400,
        headers: {
            "content-type": "application/json"
        }
    }));

    const tokenSupplier = createContentgridTokenExchangeTokenSupplier({
        exchangeUrl: "https://extensions.contentgrid.example/exchange/token",
        fetch: fakeFetch
    });

    expect(tokenSupplier("https://example.com/xyz")).rejects.toBeInstanceOf(TokenExchangeProtocolViolationError);
})

test("failed token exchange with non-OAuth error", async () => {
    const fakeFetch = jest.fn(async () => new Response("<<<<<", {
        status: 400,
        headers: {
            "content-type": "text/html"
        }
    }));

    const tokenSupplier = createContentgridTokenExchangeTokenSupplier({
        exchangeUrl: "https://extensions.contentgrid.example/exchange/token",
        fetch: fakeFetch
    });

    expect(tokenSupplier("https://example.com/xyz")).rejects.toBeInstanceOf(TokenExchangeProtocolViolationError);
})
