import typescript from "@rollup/plugin-typescript"
import babel from "@rollup/plugin-babel"
import clear from "rollup-plugin-clear"

import * as glob from 'glob';
import path from 'node:path';

const sourcePath = path.resolve(process.cwd() + '/src');

/** @type {import('rollup').RollupOptions} */
export default {
    //input: 'src/index.ts',
    input: Object.fromEntries(
        glob.sync(sourcePath+'/**/*.ts').map(file => [
            path.relative(
                sourcePath,
                file.slice(0, file.length - path.extname(file).length)
            ),
            file
        ])
    ),
    output: [
        {
            entryFileNames: '[name].js',
            format: 'cjs',
            dir: 'build',
            exports: 'named',
            sourcemap: true,
            interop: "auto"
        },
        {
            entryFileNames: '[name].mjs',
            dir: 'build',
            format: 'esm',
            sourcemap: true,
            interop: "auto"
        }
    ],
    plugins: [
        typescript({
            importHelpers: true,
            outDir: "build"
        }),
        babel({
            extensions: ['.js', '.ts'],
            babelHelpers: "runtime",
        }),
        clear({
            targets: ['build']
        })
    ],
    external: id => {
        if(id.startsWith(sourcePath)) {
            return false;
        } else if(id.startsWith('./') || id.startsWith('../')) {
            return false;
        }
        return true;
    }
}
