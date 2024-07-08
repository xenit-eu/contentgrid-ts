import { AuthenticationTokenSupplier } from "./types";

type UriPredicate = (uri: string) => boolean;

interface SupplierEntry {
    predicate: UriPredicate;
    supplier: AuthenticationTokenSupplier;
}

export default function createCompositeTokenSupplier(suppliers: readonly SupplierEntry[]): AuthenticationTokenSupplier {
    return async (uri, opts) => {
        for(const supplier of suppliers) {
            if(supplier.predicate(uri)) {
                return await supplier.supplier(uri, opts);
            }
        }
        return null;
    }
}

export class CompositeTokenSupplierBuilder {

    public constructor();
    /* @internal */
    public constructor(suppliers: readonly SupplierEntry[]);
    public constructor(
        private readonly suppliers: readonly SupplierEntry[] = []
    ) {

    }

    public predicate(predicate: UriPredicate, supplier: AuthenticationTokenSupplier): CompositeTokenSupplierBuilder {
        return new CompositeTokenSupplierBuilder(this.suppliers.concat([{ predicate, supplier }]))
    }

    public origin(origin: string, supplier: AuthenticationTokenSupplier): CompositeTokenSupplierBuilder {
        return this.predicate(uri => {
            return new URL(uri).origin === origin
        }, supplier);
    }

    public default(supplier: AuthenticationTokenSupplier): CompositeTokenSupplierBuilder {
        return this.predicate(() => true, supplier);
    }

    public build(): AuthenticationTokenSupplier {
        return createCompositeTokenSupplier(this.suppliers);
    }

}
