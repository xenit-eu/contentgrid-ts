export interface TypedResponse<BodyType> extends Response {
    json(): Promise<BodyType>
}
