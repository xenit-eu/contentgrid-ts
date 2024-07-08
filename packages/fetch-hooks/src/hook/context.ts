import { HookedFetch } from "./core";
import { FetchHookInvocation } from "./invocation";

export class RequestContext {
    private constructor(
        /**
         * Initial entrypoint where the request entered the hook chain
         */
        public readonly entrypoint: HookedFetch,

        /**
         * Super invocation, the invocation that caused the re-entry into the hook chain via the entrypoint
         */
        public readonly superInvocation: FetchHookInvocation | null,
        /**
         * Super context, the context belonging to the invocation that caused re-entry into the hook chain via the entrypoint
         */
        public readonly superContext: RequestContext | null,
    ) {

    }

    public static create(entrypoint: HookedFetch) {
        return new RequestContext(entrypoint, null, null);
    }

    public withSuperInvocation(invocation: FetchHookInvocation) {
        return new RequestContext(this.entrypoint, invocation, this);
    }

    /**
     * Depth of recursive invocations of the hook chain
     */
    public get recursiveInvocationDepth(): number {
        if(!this.superContext) {
            return 0;
        }
        return this.superContext.recursiveInvocationDepth + 1;
    }
}

const requestContextSymbol = Symbol("fetch-hooks: request context");

export interface RequestInitWithContext extends RequestInit {
    [requestContextSymbol]: RequestContext
}

export function enhanceRequestInitWithContext(init: RequestInit|undefined, context: RequestContext): RequestInitWithContext {
    return {
        ...(init ?? {}),
        ...createRequestInitWithContext(context)
    }
}

export function createRequestInitWithContext(context: RequestContext): RequestInitWithContext {
    return {
        [requestContextSymbol]: context
    };
}

function hasContext(init: RequestInit): init is RequestInitWithContext {
    return requestContextSymbol in init;
}

export function getRequestContext(...args: Parameters<HookedFetch>): RequestContext | null {
    const init = args[1];
    if(init && hasContext(init)) {
        return init[requestContextSymbol];
    }
    return null;
}
