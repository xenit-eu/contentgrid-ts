import { TypedBody } from "./body";

export interface TypedResponse<BodyType> extends Response, TypedBody<BodyType> {
    json(): Promise<BodyType>
}
