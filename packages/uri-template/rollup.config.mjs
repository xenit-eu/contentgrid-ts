import typescript from "@rollup/plugin-typescript"
import babel from "@rollup/plugin-babel"

/** @type {import('rollup').RollupOptions} */
export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'build/index.js',
            format: 'cjs',
            exports: 'named'
        },
        {
            file: "build/index.mjs",
            format: 'esm',

        }
    ],
    plugins: [
        typescript({
            importHelpers: true
        }),
        babel({
            extensions: ['.js', '.ts'],
            babelHelpers: "runtime",
        })
    ],
    external: ['tslib', 'uri-templates']
}
