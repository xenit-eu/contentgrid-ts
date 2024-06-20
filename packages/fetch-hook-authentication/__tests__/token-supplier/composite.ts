import { CompositeTokenSupplierBuilder } from "../../src/token-supplier/composite";
import { AuthenticationTokenSupplier } from "../../src/token-supplier";

function createFakeTokenSupplier(token: string): AuthenticationTokenSupplier {
    return async () => ({
        token,
        expiresAt: null
    });
}

const supplierOpts = {
    fetch: jest.fn()
}

test("composite without fallback", async () => {
    const compositeSupplier = new CompositeTokenSupplierBuilder()
        .origin("http://example.com", createFakeTokenSupplier("example.com-token"))
        .origin("http://example.org", createFakeTokenSupplier("example.org-token"))
        .build()

    expect(compositeSupplier("http://example.com/abc/def", supplierOpts)).resolves.toEqual({ token: "example.com-token", expiresAt: null });
    expect(compositeSupplier("http://example.org/zzzz", supplierOpts)).resolves.toEqual({token: "example.org-token", expiresAt: null});
    expect(compositeSupplier("http://example.net/", supplierOpts)).resolves.toBeNull();

})

test("composite with fallback", async () => {
    const compositeSupplier = new CompositeTokenSupplierBuilder()
        .origin("http://example.com", createFakeTokenSupplier("example.com-token"))
        .default(createFakeTokenSupplier("default-token"))
        .build()

    expect(compositeSupplier("http://example.com/abc/def", supplierOpts)).resolves.toEqual({ token: "example.com-token", expiresAt: null });
    expect(compositeSupplier("http://example.org/zzzz", supplierOpts)).resolves.toEqual({ token: "default-token", expiresAt: null });

})
