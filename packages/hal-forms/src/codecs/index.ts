export * from "./api";
export * from "./errors";
export * as Encoders from "./encoders";

import { HalFormsCodecs, HalFormsCodecsMatchers } from "./api";
import { multipartForm, nestedJson, uriList, urlencodedForm } from "./encoders";

/**
 * Default HAL-FORMS codecs
 */
export default HalFormsCodecs.builder()
    .registerEncoder(
        HalFormsCodecsMatchers.all(
            HalFormsCodecsMatchers.unsetContentType(),
            HalFormsCodecsMatchers.encodedToRequestBody()
        ),
        nestedJson()
    )
    .registerEncoder("application/json", nestedJson())
    .registerEncoder("text/uri-list", uriList())
    .registerEncoder("multipart/form-data", multipartForm())
    .registerEncoder("application/x-www-form-urlencoded", urlencodedForm())
    .build();
