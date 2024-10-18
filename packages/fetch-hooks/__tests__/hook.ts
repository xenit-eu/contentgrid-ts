import fetchMock from 'fetch-mock';
import { test, expect, describe } from "@jest/globals";
import type { Fetch } from '../src/hook/core';
import createHook from '../src/hook';
import { DuplicateInvocationError, FetchHookInvocationImpl } from '../src/hook/invocation';

describe("hook", () => {
    const fakeFetch = fetchMock.sandbox();

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

    fakeFetch.get("http://example.com/xyz", async (_url, {headers}) => {
        const h = new Headers(headers)
        if(!h.has("X-Loopback")) {
            return 402;
        }
        return {
            "XXX": 123
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
                body: request.body,
                duplex: "half" // This is required when a stream is sent, but it is not part of the types yet
            } as unknown as RequestInit)
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

    test("start of hook chain is accessible", async () => {
        /*
         * How does this test work?
         * 1. Two hooks are installed; requests go loopbackHook -> subRequestHook -> fakeFetch
         * 2. From subRequestHook, send an additional request to the entrypoint. This should go through loopbackHook again
         *      (which adds a header that is checked in fakeFetch)
         * 3. From the response of that additional request, update the in-flight request and send it on
         *
         * We expect requests sent to the entrypoint to be round-tripped through all hooks again.
         * If that does not happen, the X-Loopback: true header is not set on the request to example.com,
         * which will respond with a 402 error. That will cause an error to be thrown without going to next
         */
        const loopbackHook = createHook(({ request, next}) => {
            request.headers.set("X-Loopback", "true")
            return next();
        });

        const subRequestHook = createHook(async ({ request, next, entrypoint }) => {
            if (request.url.startsWith("http://localhost/")) {
                const response = await entrypoint("http://example.com/xyz")
                if(response.ok) {
                    return await next(new Request(request, {
                        body: JSON.stringify({s: await response.text()})
                    }))
                } else {
                    throw new Error("Response was not OK")
                }
            }
            return await next();
        });

        const recursiveInvocationCheckHook = createHook((invocation) => {
            const invocationImpl = invocation as FetchHookInvocationImpl;
            if(invocation.request.url.startsWith("http://localhost/")) {
                // This is the top-level invocation
                expect(invocationImpl._requestContext.recursiveInvocationDepth).toEqual(0);
            } else {
                // This is a nested invocation
                expect(invocationImpl._requestContext.recursiveInvocationDepth).toEqual(1);
            }
            return invocation.next();
        });

        const hookedFetch = recursiveInvocationCheckHook(loopbackHook(subRequestHook((fakeFetch as Fetch))));

        const hookedResponse = await hookedFetch("http://localhost/length", {
            method: "POST" // Method POST, so we can later set the body
        });

        expect(hookedResponse.status).toEqual(200);
        expect(await hookedResponse.json()).toEqual({
            s: '{"XXX":123}',
            length: 11
        })

    })

})
