import { ValueProvider, ValueProviderResolver } from "./value-provider";

import createHook, { FetchHook, ReadonlyFetchHookInvocation } from "./hook";

export function appendHeader(headerName: string, value: ValueProvider<string | null, [ReadonlyFetchHookInvocation]>): FetchHook {
    return createHook(async (invocation) => {
        const resolved = await ValueProviderResolver.fromValueProvider(value).resolve(invocation);

        if(resolved !== null) {
            invocation.request.headers.append(headerName, resolved);
        }
        return invocation.next();
    })
}

export function setHeader(headerName: string, value: ValueProvider<string | null, [ReadonlyFetchHookInvocation]>): FetchHook {
    return createHook(async (invocation) => {
        const resolved = await ValueProviderResolver.fromValueProvider(value).resolve(invocation);
        if(resolved !== null) {
            invocation.request.headers.set(headerName, resolved);
        }
        return await invocation.next();
    })
}
