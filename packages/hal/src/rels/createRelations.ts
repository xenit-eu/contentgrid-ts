import UriTemplate from "@contentgrid/uri-template";
import LinkRelation, { PlainLinkRelation } from "./LinkRelation";

export default function createRelations<T extends readonly string[]>(names: T): Record<T[number], LinkRelation>;
export default function createRelations<T extends readonly string[]>(template: UriTemplate, names: T): Record<T[number], LinkRelation>;

export default function createRelations<T extends readonly string[]>(nameOrTemplate: T | UriTemplate, secondNames?: T): Record<T[number], LinkRelation> {
    return doCreateRelations(resolveParams(nameOrTemplate, secondNames));
}


function doCreateRelations<T extends readonly string[]>({template, names}: { template?: UriTemplate, names: T }): Record<T[number], LinkRelation> {

    const data: Partial<Record<T[number], LinkRelation>> = {};

    for (const name of names) {
        if(template) {
            data[name as T[number]] = new PlainLinkRelation(template.expand([name]));
        } else {
            data[name as T[number]] = new PlainLinkRelation(name);
        }
    }

    return data as Record<T[number], LinkRelation>;
}

function resolveParams<T extends readonly string[]>(nameOrTemplate: T | UriTemplate, secondNames?: T): { template?: UriTemplate, names: T } {
    if(nameOrTemplate instanceof UriTemplate && Array.isArray(secondNames)) {
        return {
            template: nameOrTemplate,
            names: secondNames
        }
    } else if(Array.isArray(nameOrTemplate)) {
        return {
            names: nameOrTemplate as T
        }
    } else {
        throw new Error("Invalid parameters");
    }

}
