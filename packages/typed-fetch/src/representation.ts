declare const _representationType: unique symbol;

export type RepresentationOf<T> = RequestInit["body"] & {
    [_representationType]: T
};

export function createUnsafe<T>(body: RequestInit["body"]): RepresentationOf<T> {
    return body as RepresentationOf<T>;
}

type Tail<T extends any[]> = T extends [infer _A, ...infer R] ? R : never;

export function json<T>(value: T, ...args: Tail<Parameters<typeof JSON.stringify>>): RepresentationOf<T> {
    return createUnsafe(JSON.stringify(value, ...args));
}
