# `@contentgrid/typed-fetch`

Typed `fetch()` requests and responses using Typescript.

## Usage

This library is most useful when used with other code that provides a `TypedRequestSpec` which describes the shape of the request and response body.

```typescript
import { TypedRequestSpec, request, Representation, fetch as typedFetch } from '@contentgrid/typed-fetch'


namespace myLibrary {
    // This is example code that describes the hypothetical library.
    // Note that the library *knows* the request and response format of POST http://example.com/string-size and has created types for them

    export interface StringSizeRequest {
        string: string;
    }

    export interface StringSizeResponse {
        string: string;
        length: number;
    }

    export function stringSizeRequest(): TypedRequestSpec<StringSizeRequest, StringSizeResponse> {
        return {
            method: "POST",
            uri: "http://example.com/string-size"
        }
    }
}


// Retrieve a TypedRequestSpec somewhere
const requestSpec = myLibrary.stringSizeRequest();

// Create a Request
const request = request(requestSpec, {
    // The type of 'body' is type-checked so it confirms to `StringSizeRequest`
    body: Representation.json({
        string: "abc"
    }),
    // All other standard fetch Request options are valid here, except for 'method'
});


(async () => {
    // Perform the request, just like a standard fetch()
    const response = await typedFetch(request);

    if(response.ok) {
        const data = await response.json(); // Type is `StringSizeResponse`
        console.log(data.length);
    }

}())

```
