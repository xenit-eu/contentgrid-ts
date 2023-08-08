declare const _requestType: unique symbol;
declare const _responseType: unique symbol;

export interface TypedRequest<RequestType, ResponseType> {
    readonly url: string;
    readonly method: string;
    readonly [_requestType]: RequestType;
    readonly [_responseType]: ResponseType;
}

export type RequestBodyType<S extends TypedRequest<any, any>> = S[typeof _requestType];
export type ResponseBodyType<S extends TypedRequest<any, any>> = S[typeof _responseType];

export function request<Resp>(method: "GET", url: string): TypedRequest<never, Resp>;
export function request<Req, Resp>(method: Exclude<string, "GET">, url: string): TypedRequest<Req, Resp>;
export function request<Req, Resp>(method: string, url: string): TypedRequest<Req, Resp> {
    return {
        url,
        method
    } as TypedRequest<Req, Resp>
}
