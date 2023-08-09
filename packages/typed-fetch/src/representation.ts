declare const _representationType: unique symbol;

export type RepresentationOf<T> = RequestInit["body"] & {
    [_representationType]: T
};

type Tail<T extends any[]> = T extends [infer _A, ...infer R] ? R : never;

export function json<T>(value: T, ...args: Tail<Parameters<typeof JSON.stringify>>): RepresentationOf<T> {
    return JSON.stringify(value, ...args) as RepresentationOf<T>;
}
