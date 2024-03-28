import { ValueProvider, resolveValueProvider } from "./value-provider";

import createHook, { FetchHook } from "./hook";

export function appendHeader(headerName: string, value: ValueProvider<string | null>): FetchHook {
    return createHook(async (invocation) => {
        const resolved = await resolveValueProvider(invocation, value);
        if(resolved !== null) {
            invocation.request.headers.append(headerName, resolved);
        }
        return invocation.next();
    })
}

export function setHeader(headerName: string, value: ValueProvider<string | null>): FetchHook {
    return createHook(async (invocation) => {
        const resolved = await resolveValueProvider(invocation, value);
        if(resolved !== null) {
            invocation.request.headers.set(headerName, resolved);
        }
        return await invocation.next();
    })
}
