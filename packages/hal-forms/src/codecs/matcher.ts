export type Predicate<T = any> = (value: T) => boolean;
type PredicateValue<T> = T extends Predicate<infer V> ? V : never;

const predicateTrue: Predicate = () => true;

export interface Matcher<T, U> {
    match(value: T, postFilter?: Predicate<U>): U | null;
}


export class PredicateMatcher<P extends Predicate, U> implements Matcher<PredicateValue<P> , U> {
    public constructor(
        private readonly predicate: P,
        private readonly value: U
    ) {

    }

    public match(value: PredicateValue<P>, postFilter: Predicate<U> = predicateTrue): U | null {
        if (this.predicate(value) && postFilter(this.value)) {
            return this.value;
        }
        return null;
    }
}

export type Provider<T, U> = (value: T) => U | null;

export class ProviderMatcher<T, U> implements Matcher<T, U> {
    public constructor(
        private readonly provider: Provider<T, U>
    ) {

    }

    public match(value: T, postFilter: Predicate<U> = predicateTrue): U | null {
        const match = this.provider(value);
        if (match && postFilter(match)) {
            return match;
        }
        return null;
    }
}

export class MultiMatcher<P extends Predicate, U> implements Matcher<PredicateValue<P>, U> {
    private readonly matchers: Array<Matcher<PredicateValue<P>, U>> = []

    public registerPredicate(predicate: P, value: U): this {
        return this.registerMatcher(new PredicateMatcher(predicate, value));
    }

    public registerProvider(provider: Provider<PredicateValue<P>, U>): this {
        return this.registerMatcher(new ProviderMatcher(provider));
    }

    public registerMatcher(matcher: Matcher<PredicateValue<P>, U>): this {
        this.matchers.push(matcher);
        return this;
    }

    public match(value: PredicateValue<P>, postFilter: Predicate<U> = predicateTrue): U | null {
        for(const matcher of this.matchers) {
            const matchedValue = matcher.match(value, postFilter);
            if(matchedValue !== null) {
                return matchedValue;
            }
        }

        return null;
    }
}
