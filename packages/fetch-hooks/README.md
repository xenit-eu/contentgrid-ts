# `@contentgrid/fetch-hooks`

Insert hooks around `fetch()`, to centralize cross-functional behaviors.

## Usage

Compose cross-functional hooks around `fetch()`, without creating a custom client wrapping fetch.

Automatically adding an additional header to all requests is as easy as:

```typescript
import { setHeader } from "@contentgrid/fetch-hooks/request";

const exampleAuthorizationHook = setHeader("Authorization", ({request}) => {
    if(request.url.startsWith("https://example.com/")) {
        return "Bearer my-bearer-token"
    }
    return null; // Do not set the header
});

const myFetch = exampleAuthorizationHook(fetch);


myFetch("https://example.com/abc") // Authorization header automatically added
    .then([...]);

myFetch("https://example.org/zzzz") // Different domain, no Authorization header added
    .then([...]);

```

## Writing hooks

Next to the built-in hooks, it is also possible to create your own hooks.

```typescript
import createFetchHook from "@contentgrid/fetch-hooks";

const requireJsonHook = createFetchHook(({request, next, entrypoint}) => {

    // Do something fun with the request, before sending it off to the next hook
    // For example, setting an accept header when we have none
    if(!request.headers.has("accept")) {
        request.headers.set("accept", "application/json, application/*+json;q=0.9, */*;q=0.1")
    }

    // Send another request that will also pass through all hooks again.
    // Be careful not to cause infinite loops!
    if(request.url != "http://example.net/log_request") {
        await entrypoint("http://example.net/log_request", {
            method: "POST",
            body: request.uri
        });
    }

    const response = await next(); // Forward the modified request to the next hook

    // Do something evil with the response before returning it
    // For example, rejecting non-json responses
    const contentType = response.headers.get("content-type");
    if(contentType !== "application/json" && !contentType.matches(/^application\/[^+]+\+json$/)) {
        throw new Error("We wants a JSON content-type");
    }

    return response;
});

const myFetch = compose(
    requireJsonHook,
    exampleAuthorizationHook
)(fetch);

// Go on to fetch your data

```
