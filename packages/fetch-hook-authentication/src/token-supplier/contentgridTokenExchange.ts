import { FetchHooksError } from "@contentgrid/fetch-hooks";
import { AuthenticationToken, AuthenticationTokenSupplier } from "./types";
import MimeType from "whatwg-mimetype";
import { ValueProvider, ValueProviderResolver } from "@contentgrid/fetch-hooks/value-provider";


interface TokenExchangeConfiguration {
    exchangeUrl: ValueProvider<string, [{ fetch: typeof fetch }]>;
}

function createTokenRequestBody(resource: string): URLSearchParams {
    const formData = new URLSearchParams();
    formData.append("grant_type", "https://contentgrid.cloud/oauth2/grant/extension-token");
    formData.append("resource", resource);
    return formData;
}


function createAuthenticationToken(responseBody: any): AuthenticationToken {
    // Verify response validity: https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
    if(!("token_type" in responseBody)) {
        throw new TokenExchangeProtocolViolationError(`Missing 'token_type' in response`);
    }
    if(!("access_token" in responseBody)) {
        throw new TokenExchangeProtocolViolationError(`Missing 'access_token' in response`);
    }

    if(String(responseBody["token_type"]).toLowerCase() !== "bearer") {
        throw new TokenExchangeProtocolViolationError(`Unsupported token type ${responseBody["token_type"]}`);
    }

    const expiry = "expires_in" in responseBody ? new Date(Date.now() + responseBody["expires_in"] * 1000) : null;

    return {
        token: responseBody["access_token"],
        expiresAt: expiry
    };
}

function isJsonContentType(contentType: string | null): boolean {
    if(!contentType) {
        return false;
    }
    const mimetype = new MimeType(contentType);

    // https://mimesniff.spec.whatwg.org/#json-mime-type
    return (mimetype.type === "application" || mimetype.type === "text") && (mimetype.subtype === "json" || mimetype.subtype.endsWith("+json"));

}

function createOAuth2Error(responseBody: any): OAuth2AuthenticationError | null {
    if(!("error" in responseBody)) {
        return null; // 'error' field is required in OAuth error responses: https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
    }
    return new OAuth2AuthenticationError(
        responseBody["error"],
        responseBody["error_description"]
    );
}

export default function createContentgridTokenExchangeTokenSupplier(config: TokenExchangeConfiguration): AuthenticationTokenSupplier {
    const exchangeUrlResolver = ValueProviderResolver.fromValueProvider(config.exchangeUrl);
    return async (uri, opts) => {
        const exchangeUrl = await exchangeUrlResolver.resolve(opts);
        const response = await opts.fetch(exchangeUrl, {
            signal: opts?.signal ?? null,
            method: "POST",
            body: createTokenRequestBody(uri)
        })

        if(response.ok) {
            if(isJsonContentType(response.headers.get("content-type"))) {
                return createAuthenticationToken(await response.json());
            } else {
                throw new TokenExchangeProtocolViolationError(`Content type ${response.headers.get('content-type')} is not JSON`);
            }
        } else {
            if(isJsonContentType(response.headers.get("content-type"))) {
                const oauthError = createOAuth2Error(await response.json());
                if(oauthError) {
                    throw oauthError;
                }
            }
            throw new TokenExchangeProtocolViolationError(`Non-OAuth response error: ${response.status} ${response.statusText}`);
        }
    }

}

/**
 * Base class for token exchange errors
 */
export class TokenExchangeError extends FetchHooksError {
    public constructor(message: string) {
        super(`Token exchange failed: ${message}`)
    }
}

/**
 * Unexpected deviation from the expected token exchange flow
 */
export class TokenExchangeProtocolViolationError extends TokenExchangeError {
    public constructor(message: string) {
        super(`Protocol violation: ${message}`)
    }
}

/**
 * A potentially-expected OAuth error response
 */
export class OAuth2AuthenticationError extends TokenExchangeError {
    public constructor(
        public readonly code: string,
        public readonly description: string,
    ) {
        super(`OAuth2 error ${code}: ${description}`)
    }

}
