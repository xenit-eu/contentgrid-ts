import fetchMock from 'fetch-mock';
import { describe, test, expect } from "@jest/globals";
import { Representation, createTypedFetch, createRequest, TypedRequestSpec } from "../src";
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
        fakeFetch.config.Request = Request;
        const typedFetch = createTypedFetch(fakeFetch as typeof fetch);

        fakeFetch.post("http://localhost/length", async (_url: any, _options: any, request: Request) => {
            try {
                const b = await request.json();
                return {
                    s: b.s,
                    length: b.s.length
                }
            } catch(e) {
                console.error(e);
                return 400;
            }
        })

        const spec = {
            method: "POST",
            url: "http://localhost/length"
        } as TypedRequestSpec<TestBody, TestResponse>

        const req = createRequest(spec, {
            body: Representation.json({s: "def"})
        });


        const resp = await typedFetch(req);

        expect(resp.ok).toBe(true);

        const data = await resp.json();

        expect(data.length).toEqual(3);
    })

})
