export * from "./api";
export * from "./errors";
export * as Encoders from "./encoders";

import { HalFormsCodecs, HalFormsCodecsMatchers } from "./api";
import { nestedJson } from "./encoders";

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
    .build();
