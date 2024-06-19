
export interface AuthenticationToken {
    token: string;
    expiresAt: Date | null;
}


interface AuthenticationTokenSupplierOptions {
    signal?: AbortSignal
}

export type AuthenticationTokenSupplier = (uri: string, opts?: AuthenticationTokenSupplierOptions) => Promise<AuthenticationToken | null>;
