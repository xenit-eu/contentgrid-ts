import type { Fetch, HookedFetch } from "./core";
import { UsageError } from "./error";

/**
 * Parameters for invocation of a {@link FetchHook}
 */
export interface ReadonlyFetchHookInvocation {
    /**
     * The current request that is being serviced
     */
    readonly request: Request;
}

/**
 * Parameters for invocation of a {@link FetchHook}
 */
export interface FetchHookInvocation extends ReadonlyFetchHookInvocation {

    /**
     * Continue the hook invocations as currently set in {@link request}
     */
    next(): ReturnType<HookedFetch>;

    /**
     * Continue the hook invocations with a new request
     * @param request - The new request to send
     */
    next(request: Request): ReturnType<HookedFetch>;
}

export class FetchHookInvocationImpl implements FetchHookInvocation {
    public readonly request: Request;

    #nextFetch: HookedFetch | Fetch;
    #nextCalled: boolean = false;

    public constructor(
        fetchArgs: Parameters<HookedFetch>,
        nextFetch: HookedFetch | Fetch
    ) {
        this.#nextFetch = nextFetch;
        this.request = new Request(...fetchArgs);
    }


    public get next(): FetchHookInvocation["next"] {
        // Using a getter returning a function here so proceed is strongly bound to this instance
        return (request?: Request) => this.#proceed(request);
    }

    #proceed(request: Request | undefined): Promise<Response> {
        if(this.#nextCalled) {
            throw new DuplicateInvocationError("FetchHookInvocation#next()");
        }
        this.#nextCalled = true;
        return this.#nextFetch(request ?? this.request);
    }
}

export class DuplicateInvocationError extends UsageError {
    public constructor(method: string) {
        super(`${method} may only be called once`)
    }
}
