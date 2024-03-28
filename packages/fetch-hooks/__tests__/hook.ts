import fetchMock from 'fetch-mock';
import { test, expect, describe } from "@jest/globals";
import type { Fetch } from '../src/hook/core';
import createHook from '../src/hook';
import { DuplicateInvocationError } from '../src/hook/invocation';

describe("hook", () => {
    const fakeFetch = fetchMock.sandbox();
    global.Request = fakeFetch.config.Request as any;

    fakeFetch.post("http://localhost/length", async (_url, {headers, body}) => {
        const h = new Headers(headers)
        if(!h.has("X-Loopback")) {
            return 402;
        }
        try {
            // This is fetchMock being annoying and having mismatched types between what body actually is, and what it pretends to be
            const b = JSON.parse((await body) as string);
            return {
                s: b.s,
                length: b.s.length
            }
        } catch (e) {
            console.error(e);
            return 400;
        }
    })

    test("simple hook", async () => {
        const fetchHook = createHook(({ request, next }) => {
            if (request.url.startsWith("http://localhost/")) {
                request.headers.set("X-Loopback", "true")
            }
            return next();
        });

        const hookedFetch = fetchHook(fakeFetch as Fetch);


        const unhookedResponse = await fakeFetch("http://localhost/length", {
            method: "POST",
            body: JSON.stringify({ s: "def" })
        });

        expect(unhookedResponse.status).toEqual(402);

        const hookedResponse = await hookedFetch("http://localhost/length", {
            method: "POST",
            body: JSON.stringify({ s: "def" })
        });

        expect(hookedResponse.status).toEqual(200);

    })

    test("sending a new request", async () => {
        const rewriteHook = createHook(({ request, next }) => {
            const newRequest = new Request("http://localhost/length", {
                headers: {
                    "X-Loopback": "true"
                },
                method: "POST",
                body: request.body
            })
            return next(newRequest);
        });

        const hookedFetch = rewriteHook(fakeFetch as Fetch);

        const hookedResponse = await hookedFetch("http://example.com/abc", {
            method: "POST",
            body: JSON.stringify({ s: "def" })
        });

        expect(hookedResponse.status).toEqual(200);
    })

    test("calling next() multiple times is forbidden", () => {

        const brokenHook = createHook(async ({ next }) => {
            const response = await next();
            if(!response.ok) {
                return await next();
            }
            return response;
        });

        const hookedFetch = brokenHook(fakeFetch as Fetch);

        const hookedResponsePromise = hookedFetch("http://localhost/length", {
            method: "POST",
            body: JSON.stringify({ s: "def" })
        });

        expect(hookedResponsePromise)
            .rejects
            .toThrowError(new DuplicateInvocationError("FetchHookInvocation#next()"))
    })

})
