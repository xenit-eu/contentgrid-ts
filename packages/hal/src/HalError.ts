export default class HalError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'HalError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
