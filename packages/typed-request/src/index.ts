declare const _bodyType: unique symbol;
declare const _responseType: unique symbol;

export interface RequestSpec<BodyType, ResponseType> {
    readonly url: string;
    readonly method: string;
    readonly [_bodyType]: BodyType;
    readonly [_responseType]: ResponseType;
}

export type RequestBodyType<S extends RequestSpec<any, any>> = S[typeof _bodyType];
export type ResponseBodyType<S extends RequestSpec<any, any>> = S[typeof _responseType];
