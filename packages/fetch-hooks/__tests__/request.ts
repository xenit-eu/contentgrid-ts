import fetchMock from 'fetch-mock';
import { describe, test, expect } from "@jest/globals";
import { Fetch } from '../src/hook/core';
import { setHeader } from '../src/request';

describe("setHeader", () => {
    const fakeFetch = fetchMock.createInstance();

    const testHeader = "X-Test";

    fakeFetch.get("http://localhost/", async ({options: {headers}}) => {
        const h = new Headers(headers as HeadersInit);
        return {
            test: h.get(testHeader)
        }
    })

    test("direct value", async () => {

        const hookedFetch = setHeader(testHeader, "1")(fakeFetch.fetchHandler as Fetch);

        const response = await hookedFetch("http://localhost/");

        expect(response.ok).toBe(true);
        expect(await response.json()).toEqual({
            test: "1"
        })
    })

    test("value derived from request", async () => {
        const hookedFetch = setHeader(testHeader, ({ request }) => request.url)(fakeFetch.fetchHandler as Fetch);

        const response = await hookedFetch("http://localhost/");

        expect(response.ok).toBe(true);
        expect(await response.json()).toEqual({
            test: "http://localhost/"
        })
    })

    test("value fetched with nested fetch", async () => {
        const hookedFetch = setHeader(testHeader, async ({ request }) => (await fakeFetch.fetchHandler(request)).text())(fakeFetch.fetchHandler as Fetch);

        const response = await hookedFetch("http://localhost/");

        expect(response.ok).toBe(true);
        expect(await response.json()).toEqual({
            test: "{\"test\":null}"
        })

    })
})
