import { TypedBody } from "./body";
import { Replace } from "./utils";

export type TypedResponse<BodyType> = Replace<Response, TypedBody<BodyType>>;
