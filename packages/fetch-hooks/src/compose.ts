import createHook, { FetchHook } from "./hook";

/**
 * A hook that does nothing and just proceeds
 */
const nopHook = createHook(({ next }) => next());


/**
 * Combine multiple fetch hooks in one
 * @param functions - Hooks to compose into one hook function
 */
export function compose(...functions: readonly FetchHook[]): FetchHook {
    if(functions.length === 0) {
        return nopHook;
    }
    return functions.reduce((prev, curr) => (f) => prev(curr(f)));
}
