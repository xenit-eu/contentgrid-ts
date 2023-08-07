
export default class Curie {
    constructor(public readonly curie: string, public readonly localPart: string) {

    }

    public static parseSafe(curie: string): Curie | null {
        if(!curie.startsWith('[') || !curie.endsWith(']')) {
            return null;
        }
        return this.parse(curie);
    }

    public static parse(curie: string): Curie | null {
        if(curie.startsWith('[') && curie.endsWith(']')) {
            curie = curie.substring(1, curie.length-1)
        }
        const idx = curie.indexOf(':');

        if(idx >= 0) {
            return new Curie(curie.substring(0, idx), curie.substring(idx+1))
        }
        return null;
    }

    public toString() {
        return this.curie + ':' + this.localPart;
    }

    public toSafeString() {
        return '[' + this.toString() + ']';
    }

}
