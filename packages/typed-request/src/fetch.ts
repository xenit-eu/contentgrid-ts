import { RepresentationOf } from "./representation";
import { TypedRequest } from "./request"
import { TypedResponse } from "./response";

type EnhancedRequestInit<RequestBodyType, _ResponseBodyType> = {
    method?: never;
    body?: RepresentationOf<RequestBodyType>
}

type EnhanceRequestInit<RequestBodyType, ResponseBodyType> = Omit<RequestInit, keyof EnhancedRequestInit<RequestBodyType, ResponseBodyType>> & EnhancedRequestInit<RequestBodyType, ResponseBodyType>;

export type TypedFetch = <RequestBodyType, ResponseBodyType>(request: TypedRequest<RequestBodyType, ResponseBodyType>, options: EnhanceRequestInit<RequestBodyType, ResponseBodyType>) => Promise<TypedResponse<ResponseBodyType>>;


export function createTypedFetch(originalFetch: typeof fetch): TypedFetch {
    return (request, options) => {
        return originalFetch(
            request.url,
            {
                method: request.method,
                ...options
            }
        )
    }
}
