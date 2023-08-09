import { TypedRequest } from "./request";
import { TypedResponse } from "./response";

export type TypedFetch = <RequestBodyType, ResponseBodyType>(request: TypedRequest<RequestBodyType, ResponseBodyType>) => Promise<TypedResponse<ResponseBodyType>>;

export function createTypedFetch(originalFetch: typeof fetch): TypedFetch {
    return originalFetch as TypedFetch;
}

export default createTypedFetch(fetch);
