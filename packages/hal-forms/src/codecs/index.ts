export * from "./api";
export * from "./errors";
export * as Coders from "./coders";

import { HalFormsCodecs, HalFormsEncoderMatchers } from "./api";
import * as Coders from "./coders";

/**
 * Default HAL-FORMS codecs
 */
export default HalFormsCodecs.builder()
    .registerEncoder(
        HalFormsEncoderMatchers.all(
            HalFormsEncoderMatchers.unsetContentType(),
            HalFormsEncoderMatchers.encodedToRequestBody()
        ),
        Coders.nestedJson()
    )
    .registerEncoder(
        HalFormsEncoderMatchers.encodedToRequestUrl(),
        Coders.urlencodedQuerystring()
    )
    .registerCoder("application/json", Coders.nestedJson())
    .registerEncoder("text/uri-list", Coders.uriList())
    .registerEncoder("multipart/form-data", Coders.multipartForm())
    .registerEncoder("application/x-www-form-urlencoded", Coders.urlencodedForm())
    .build();
