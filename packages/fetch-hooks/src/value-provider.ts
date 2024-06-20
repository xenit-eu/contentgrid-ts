
type NotFunction<T> = T extends Function ? never : T;

type MaybePromise<T> = T | Promise<T>;

/**
 * Provides a value
 *
 * Values can be:
 *  - hardcoded directly
 *  - hardcoded asynchronously (promise supplied once)
 *  - derived from the invocation synchronously
 *  - derived from the invocation asynchronously (potentially making another async request to fetch the value)
 */
export type ValueProvider<T, Args extends readonly any[]> =
    MaybePromise<NotFunction<T>> |
    ((...args: Args) => MaybePromise<T>) |
    ValueProviderResolver<T, Args>;

/**
 * Resolves a {@link ValueProvider} to its value
 *
 * @param request - The request in which context the value provider is evaluated
 * @param fetch - Fetch function
 * @param valueProvider - The value provider to resolve
 * @returns The value of the value provider
 * @deprecated Use {@link ValueProviderResolver} instead
 */
export function resolveValueProvider<T, Args extends readonly any[]>(args: Args, valueProvider: ValueProvider<NotFunction<T>, Args>): Promise<NotFunction<T>> {
    return ValueProviderResolver.fromValueProvider(valueProvider).resolve(...args);
}

const valueProviderResolver = Symbol("ValueProviderResolver: instance");

/**
 * Resolves a {@link ValueProvider} to its value
 */
export interface ValueProviderResolver<T, Args extends readonly any[]> {
    /**
     * Marks that this is a {@link ValueProviderResolver}, to distinguish it from other objects
     */
    readonly [valueProviderResolver]: true;
    /**
     * Resolves the value
     * @param args arguments to resolve the value
     */
    resolve(...args: Args): Promise<T>;
};

export namespace ValueProviderResolver {
    /**
     * Creates a function-backed {@link ValueProviderResolver}
     * @param func Function to call to obtain a value
     */
    export function fn<T, Args extends readonly any[]>(func: (...args: Args) => T): ValueProviderResolver<T, Args> {
        return new FunctionValueProviderResolver(func);
    }

    /**
     * Creates a constant-based {@link ValueProviderResolver}
     * @param constant The value
     */
    export function constant<T>(constant: MaybePromise<T>): ValueProviderResolver<T, readonly any[]> {
        return new ConstantValueProviderResolver(constant);
    }

    function isValueProviderResolver(object: object | null): object is ValueProviderResolver<any, any> {
        return object !== null && valueProviderResolver in object;
    }

    /**
     * Creates a {@link ValueProviderResolver} from a {@link ValueProvider} of an unknown type
     * @param valueProvider The value provider to convert to a resolver
     */
    export function fromValueProvider<T, Args extends readonly any[]>(valueProvider: ValueProvider<T, Args>): ValueProviderResolver<T, Args> {
        if(typeof valueProvider === "object" && isValueProviderResolver(valueProvider)) {
            return valueProvider;
        } else if(valueProvider instanceof Function) {
            return fn<T, Args>(valueProvider as any);
        } else {
            return constant(valueProvider);
        }
    }

    /**
     * Creates a cached {@link ValueProviderResolver}, where the initially resolved value is cached after it is requested once
     * @param valueProvider The value provider to cache
     * @returns Resolver that automatically caches the first resolved value
     */
    export function cached<T, Args extends readonly any[]>(valueProvider: ValueProvider<T, Args>): ValueProviderResolver<T, Args> {
        return new CachedValueProviderResolver(fromValueProvider(valueProvider));
    }

}

class FunctionValueProviderResolver<T, Args extends readonly any[]> implements ValueProviderResolver<T, Args> {
    public readonly [valueProviderResolver] = true as const;

    public constructor(
        private readonly func: (...args: Args) => MaybePromise<T>
    ) {

    }

    public async resolve(...args: Args): Promise<T> {
        return this.func(...args);
    }
}

class ConstantValueProviderResolver<T> implements ValueProviderResolver<T, readonly any[]> {
    public readonly [valueProviderResolver] = true as const;

    public constructor(
        private readonly constant: MaybePromise<T>
    ) {

    }

    public async resolve() {
        return this.constant;
    }
}

class CachedValueProviderResolver<T, Args extends readonly any[]> implements ValueProviderResolver<T, Args> {
    public readonly [valueProviderResolver] = true as const;

    #cachedValue: Promise<T> | undefined;

    public constructor(
        private readonly delegate: ValueProviderResolver<T, Args>
    ) {

    }

    public resolve(...args: Args): Promise<T> {
        if(!this.#cachedValue) {
            this.#cachedValue = this.delegate.resolve(...args);
        }

        return this.#cachedValue;
    }
}
