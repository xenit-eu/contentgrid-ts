
export class FetchHooksError extends Error {
    public constructor(
        message: string,
        public readonly cause?: Error
    ) {
        super(message)
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = new.target.name;
    }
}

/**
 * Indicates an error in usage of the library; this is a programming error
 */
export class UsageError extends FetchHooksError {
    public constructor(
        message: string,
        cause?: Error
    ) {
        super(message, cause)
    }
}
