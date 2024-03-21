export * from "./api";
export * from "./errors";
export * as Encoders from "./encoders";

import { HalFormsCodecs } from "./api";
import { nestedJson } from "./encoders";

/**
 * Default HAL-FORMS codecs
 */
export default HalFormsCodecs.builder()
    .registerEncoder("application/json", nestedJson())
    .build();
