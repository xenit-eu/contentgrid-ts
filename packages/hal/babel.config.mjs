/** @type {import('@babel/core').TransformOptions} */
export default {
    "presets": ["@babel/preset-env", "@babel/preset-typescript"],
    "plugins": ["@babel/plugin-transform-runtime"],
    "targets": {
        "browsers": "defaults"
    }
}
