import { PlainLinkRelation } from "./LinkRelation";
export { default as createRelations } from "./createRelations";
export { default as ianaRelations } from "./ianaRelations";
export type { default as LinkRelation } from "./LinkRelation";

export function createRelation(relation: string): PlainLinkRelation {
    return new PlainLinkRelation(relation);
}
