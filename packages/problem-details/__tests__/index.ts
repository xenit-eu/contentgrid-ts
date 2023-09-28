import { test, expect, describe } from "@jest/globals"
import { fromResponse } from "../src/index";

describe('Create problem details', () => {

    test('from a problemdetails response', async () => {
        const response = new Response(JSON.stringify({
            type: "http://example.com/rels/xyz",
            title: "XYZ"
        }), {
            status: 404,
            headers: {
                "Content-Type": "application/problem+json"
            }
        });

        const problemDetails = await fromResponse(response);

        expect(problemDetails).toEqual({
            type: "http://example.com/rels/xyz",
            status: 404,
            title: "XYZ"
        });
    })

    test('from a problemdetails response with an "about:blank" type', async () => {
        const response = new Response(JSON.stringify({
            type: "about:blank",
        }), {
            status: 404,
            headers: {
                "Content-Type": "application/problem+json"
            }
        });

        const problemDetails = await fromResponse(response);

        expect(problemDetails).toEqual({
            status: 404,
            title: ""
        });
    })

    test('from a problemdetails response with a null type', async () => {
        const response = new Response(JSON.stringify({
            type: null,
        }), {
            status: 404,
            headers: {
                "Content-Type": "application/problem+json"
            }
        });

        const problemDetails = await fromResponse(response);

        expect(problemDetails).toEqual({
            status: 404,
            title: ""
        });
    })

    test('from a non-problemdetails response', async () => {
        const response = new Response("my-response", {
            status: 403,
            statusText: "Forbidden",
            headers:{
                "Content-Type": "text/plain"
            }
        });

        const problemDetails = await fromResponse(response);

        expect(problemDetails).toEqual({
            status: 403,
            title: "Forbidden"
        });

    })

    test('from a succesful response', async () => {
        const response = new Response("my data", {
            status: 200,
            headers: {
                "Content-Type": "text/plain"
            }
        });

        expect(await fromResponse(response)).toBeNull();

    });
})
