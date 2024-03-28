import fetchMock from 'fetch-mock';
import { test, expect } from "@jest/globals";
import type { Fetch } from '../src/hook/core';
import { compose } from '../src/compose';
import { appendHeader } from '../src/request';

test("compose", async () => {
    const fakeFetch = fetchMock.sandbox();
    global.Request = fakeFetch.config.Request as any;

    const testHeader = "X-Test";

    fakeFetch.get("http://localhost/", async (_url, {headers}) => {
        const h = new Headers(headers);
        return {
            test: h.get(testHeader)
        }
    })

    const fetchHook = compose(
        appendHeader(testHeader, "1"),
        appendHeader(testHeader, "2"),
        appendHeader(testHeader, "3")
    );

    const hookedFetch = fetchHook(fakeFetch as Fetch);

    const response = await hookedFetch("http://localhost/");

    expect(response.ok).toBe(true);
    expect(await response.json()).toEqual({
        test: "1,2,3"
    })

})
