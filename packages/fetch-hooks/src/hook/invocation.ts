import { RequestContext, createRequestInitWithContext, enhanceRequestInitWithContext, getRequestContext } from "./context";
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

    /**
     * Entrypoint where request was initially sent to.
     *
     * This fetch function can be used to send additional requests through
     * the same set of hooks that the incoming request has passed through.
     */
    readonly entrypoint: Fetch;
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
    #requestContext: RequestContext;

    public constructor(
        fetchArgs: Parameters<HookedFetch>,
        nextFetch: HookedFetch | Fetch,
        currentFetch: HookedFetch
    ) {
        this.#nextFetch = nextFetch;
        this.request = new Request(...fetchArgs);
        this.#requestContext = getRequestContext(...fetchArgs) ?? RequestContext.create(currentFetch);
    }

    /**
     * @internal
     * Visible for testing only
     */
    public get _requestContext(): RequestContext {
        return this.#requestContext;
    }

    public get entrypoint(): Fetch {
        const nestedContext = this.#requestContext.withSuperInvocation(this);
        return (...args: Parameters<Fetch>) => {
            const argsCopy = args.slice() as Parameters<Fetch>;
            argsCopy[1] = enhanceRequestInitWithContext(args[1], nestedContext)
            return this.#requestContext.entrypoint(...argsCopy);
        };
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
        return this.#nextFetch(request ?? this.request, createRequestInitWithContext(this.#requestContext));
    }
}

export class DuplicateInvocationError extends UsageError {
    public constructor(method: string) {
        super(`${method} may only be called once`)
    }
}
