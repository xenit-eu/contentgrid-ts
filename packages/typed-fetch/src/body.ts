export interface TypedBody<BodyType> extends Body {
    json(): Promise<BodyType>;
}
