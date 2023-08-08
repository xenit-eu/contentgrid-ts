import fetchMock from 'fetch-mock';
import { describe, test, expect } from "@jest/globals";
import { Representation, createTypedFetch, request } from "../src";
describe("createTypedFetch", () => {

    interface TestBody {
        s: string
    }

    interface TestResponse {
        s: string;
        length: number;
    }

    test("performs a request", async () => {
        const fakeFetch = fetchMock.sandbox();
        const typedFetch = createTypedFetch(fakeFetch as typeof fetch);

        fakeFetch.post("/length", (_url, options) => {
            if (typeof options.body === "string") {
                const b = JSON.parse(options.body);
                return {
                    s: b.s,
                    length: b.s.length
                }
            } else {
                return 400;
            }
        })

        const req = request<TestBody, TestResponse>("POST", "/length");

        const resp = await typedFetch(req, {
            body: Representation.json({ s: "def" })
        })

        const data = await resp.json();

        expect(data.length).toEqual(3);
    })

})
