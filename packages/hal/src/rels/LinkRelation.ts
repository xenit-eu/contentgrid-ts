export default interface LinkRelation {
    readonly value: string;
    readonly canonical: string;
    matches(value: LinkRelationShape): boolean;
}

export class PlainLinkRelation implements LinkRelation {
    public constructor(public readonly value: string) {

    }

    public get canonical() {
        return this.value;
    }

    public matches(value: string): boolean {
        return this.canonical.toLowerCase() == value.toLowerCase();
    }
}


export type LinkRelationShape = string;
