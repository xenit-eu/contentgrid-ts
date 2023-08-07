import UriTemplate from "@contentgrid/uri-template";
import LinkRelation, { PlainLinkRelation } from "../rels/LinkRelation";
import Curie from "./Curie";
import { CuriedLinkRelation } from "./CuriedLinkRelation";
import HalError from "../HalError";
import Links from "../Links";

 interface CurieRegistry {
    resolve(curie: Curie): LinkRelation;
    compact(relation: LinkRelation): Curie | null;

}

const curiesRel = new PlainLinkRelation("curies");

namespace CurieRegistry {
    export function fromLinks(links: Links) {
        const curieLinks = links.findLinks(curiesRel);
        const curies: Record<string, UriTemplate> = {};
        for(const curieLink of curieLinks) {
            if(curieLink.name) {
                if(curies[curieLink.name]) {
                    throw new HalError(`Invalid curie ${curieLink}: '${curieLink.name} is already registered`)
                }
                curies[curieLink.name] = curieLink.template;
            } else {
                throw new HalError(`Invalid curie ${curieLink}: missing 'name' parameter`)
            }
        }
        return new DefaultCurieRegistry(curies);
    }

    export function fromMapping(mapping: Readonly<Record<string, UriTemplate>>) {
        return new DefaultCurieRegistry(mapping);
    }
}

export default CurieRegistry

export class DefaultCurieRegistry implements CurieRegistry {
    public constructor(private readonly curies: Readonly<Record<string, UriTemplate>>) {
        for(const curie in curies) {
            if(curies[curie].variables.length !== 1) {
                throw new HalError(`Template for prefix '${curie}' does not contain exactly one variable.`)
            }
        }
    }

    public resolve(curie: Curie): LinkRelation {
        var template = this.curies[curie.curie]
        return new CuriedLinkRelation(curie, template)
    }

    public compact(relation: LinkRelation): Curie | null {
        const value = relation.canonical;

        for(const curie in this.curies) {
            const match = this.curies[curie].match(value);
            if(match) {
                const localPart = extractSingleMatchValue(match);
                if(localPart) {
                    return new Curie(curie, localPart);
                }
            }
        }
        return null;
    }
}

function extractSingleMatchValue(match: { [x: string]: string | Record<string, string>; }): string | null {
    for(const key in match) {
        const val = match[key];
        if(typeof val === "string") {
            return val;
        } else {
            return extractSingleMatchValue(val);
        }
    }
    return null;
}
