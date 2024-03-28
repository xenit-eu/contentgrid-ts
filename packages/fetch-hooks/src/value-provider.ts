import type { ReadonlyFetchHookInvocation } from "./hook";

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
export type ValueProvider<T> = MaybePromise<NotFunction<T>> | ((invocation: ReadonlyFetchHookInvocation) => MaybePromise<NotFunction<T>>);

/**
 * Resolves a {@link ValueProvider} to its value
 *
 * @param request - The request in which context the value provider is evaluated
 * @param fetch - Fetch function
 * @param valueProvider - The value provider to resolve
 * @returns The value of the value provider
 */
export function resolveValueProvider<T>(invocation: ReadonlyFetchHookInvocation, valueProvider: ValueProvider<NotFunction<T>>): Promise<NotFunction<T>> {
    if (valueProvider instanceof Function) {
        return Promise.resolve(valueProvider(invocation));
    } else {
        return Promise.resolve(valueProvider);
    }
}
