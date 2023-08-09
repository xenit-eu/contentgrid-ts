import { TypedBody } from "./body";
import { RepresentationOf } from "./representation";
import { Replace } from "./utils";

declare const _requestType: unique symbol;
declare const _responseType: unique symbol;

export interface TypedRequestSpec<RequestType, ResponseType> {
    readonly url: string;
    readonly method: string;
    readonly [_requestType]?: RequestType;
    readonly [_responseType]?: ResponseType;
}

export type RequestBodyType<S extends TypedRequestSpec<any, any>> = Exclude<S[typeof _requestType], unknown>;
export type ResponseBodyType<S extends TypedRequestSpec<any, any>> = Exclude<S[typeof _responseType], unknown>;

type EnhancedRequestInit<RequestBodyType, _ResponseBodyType> = {
    method?: never;
    body?: RepresentationOf<RequestBodyType>
}

type EnhanceRequestInit<RequestBodyType, ResponseBodyType> = Omit<RequestInit, keyof EnhancedRequestInit<RequestBodyType, ResponseBodyType>> & EnhancedRequestInit<RequestBodyType, ResponseBodyType>;

export function createRequest<Req, Resp>(spec: TypedRequestSpec<Req, Resp>, init?: EnhanceRequestInit<Req, Resp>): TypedRequest<Req, Resp> {
    return new Request(spec.url, {
        method: spec.method,
        ...init
    }) as TypedRequest<Req, Resp>;
}


export type TypedRequest<RequestType, ResponseType> = Replace<Request, keyof TypedRequestSpec<RequestType, ResponseType> & TypedBody<RequestType>>
