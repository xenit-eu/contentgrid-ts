import { FetchHook } from "@contentgrid/fetch-hooks";
import { setHeader } from "@contentgrid/fetch-hooks/request";
import { AuthenticationTokenSupplier } from "./token-supplier";
import { ValueProvider, ValueProviderResolver } from "@contentgrid/fetch-hooks/value-provider";
export * from "./token-supplier";

interface AuthenticationTokenHookOptions {
    tokenSupplier: ValueProvider<AuthenticationTokenSupplier, []>;
}


export default function createBearerAuthenticationHook(opts: AuthenticationTokenHookOptions): FetchHook {
    const tokenSupplierResolver = ValueProviderResolver.cached(ValueProviderResolver.fromValueProvider(opts.tokenSupplier));
    return setHeader("Authorization", async ({ request, entrypoint }) => {
        const tokenSupplier = await tokenSupplierResolver.resolve();
        const authenticationToken = await tokenSupplier(request.url, { signal: request.signal, fetch: entrypoint });
        if(authenticationToken) {
            return "Bearer " + authenticationToken.token;
        } else {
            return null;
        }
    })
}
