import { FetchHook } from "@contentgrid/fetch-hooks";
import { setHeader } from "@contentgrid/fetch-hooks/request";
import { AuthenticationTokenSupplier } from "./token-supplier";
export * from "./token-supplier";

interface AuthenticationTokenHookOptions {
    tokenSupplier: AuthenticationTokenSupplier;
}


export default function createBearerAuthenticationHook(opts: AuthenticationTokenHookOptions): FetchHook {
    return setHeader("Authorization", async ({ request, entrypoint }) => {
        const authenticationToken = await opts.tokenSupplier(request.url, { signal: request.signal, fetch: entrypoint });
        if(authenticationToken) {
            return "Bearer " + authenticationToken.token;
        } else {
            return null;
        }
    })
}
