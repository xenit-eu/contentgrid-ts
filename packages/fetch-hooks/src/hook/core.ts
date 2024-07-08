import { RequestInitWithContext } from "./context";
import { FetchHookInvocation, FetchHookInvocationImpl } from "./invocation";

export type Fetch = typeof fetch;

/**
 * Hook function that can be applied on `fetch()` to return a new, hooked `fetch()` function
 */
export interface FetchHook {
    (fetch: Fetch | HookedFetch): HookedFetch;
};

/**
 * Definition of a fetch hooking function
 */
export type FetchHookDefinition = (invocation: FetchHookInvocation) => Promise<Response>;


const isHookedFetch = Symbol("fetch-hooks: isHookedFetch");

/**
 * The fetch function that has hooks
 */
export interface HookedFetch extends Fetch {

    /**
     * Internal extension to fetch that passes the context of the current request on
     * @internal
     */
    (request: Request, init?: RequestInitWithContext | undefined): Promise<Response>
    /**
     * Distinguishes a hooked fetch from the plain fetch function, so they can be distinguished
     */
    readonly [isHookedFetch]: true;
}

/**
 * Creates a hook from a definition
 * @param hookDefinition - Hook definition
 * @returns Hook function that can be applied to `fetch()`
 */
export default function createHook(hookDefinition: FetchHookDefinition): FetchHook {
    return fetchFn => {
        const newFetch = markHookedFetch(function (...args: Parameters<HookedFetch>) {
            return hookDefinition(new FetchHookInvocationImpl(args, fetchFn, newFetch));
        });
        return newFetch;
    };
}

type InitialSettable<T> = { -readonly [k in keyof T]?: T[k] };
function markHookedFetch(fetch: Fetch): HookedFetch {
    const writableFetch = fetch as InitialSettable<HookedFetch> ;
    writableFetch[isHookedFetch] = true;
    return writableFetch as HookedFetch;
}
