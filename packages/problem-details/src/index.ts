export interface ProblemDetail {
    readonly type?: string;
    readonly status: number;
    readonly title: string;
    readonly detail?: string;
    readonly instance?: string;
}

export async function fromResponse<T extends ProblemDetail>(response: Response): Promise<T | null> {
    if(response.ok) {
        return null;
    }
    if(response.headers.get("content-type")?.toLowerCase() !== "application/problem+json") {
        return {
            status: response.status,
            title: response.statusText
        } as T;
    }

    const data = await response.json();

    data.status ??= response.status;
    data.title ??= response.statusText;
    if(data.type === null || data.type === "about:blank") {
        delete data.type;
    }

    return data as T;
}

export class ProblemDetailError<T extends ProblemDetail> extends Error {
    constructor(public readonly problemDetail: T) {
        super(problemDetail.title);
        this.name = 'ProblemDetailError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export async function checkResponse(response: Response): Promise<Response> {
    const problem = await fromResponse(response);

    if(problem !== null) {
        throw new ProblemDetailError(problem);
    }

    return response;
}
