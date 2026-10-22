import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    // The mist engine normally comes from npm (@tik-choco/mistlib). Point
    // MISTLIB_LOCAL at a local `wasm-pack build` output (mistlib-dev's
    // mistlib-wasm/pkg) in .env to run against an engine you're editing.
    //
    // An alias rather than an npm install so switching leaves package.json and
    // the lockfile untouched — there's nothing to remember to revert. The
    // trade-off: this only redirects Vite (dev, build, and vitest, which reads
    // this same config). `tsc` keeps reading types from node_modules, so if the
    // engine's API itself changed, install the local build instead:
    //   npm i "@tik-choco/mistlib@file:../mistlib-dev/mistlib-wasm/pkg"
    //
    // '' as the prefix: loadEnv only exposes VITE_-prefixed keys by default, and
    // MISTLIB_LOCAL is build-time config that must never reach client code.
    var localEngine = loadEnv(mode, process.cwd(), '').MISTLIB_LOCAL;
    var alias = {};
    var localEnginePath;
    if (localEngine) {
        localEnginePath = path.resolve(process.cwd(), localEngine);
        alias['@tik-choco/mistlib'] = localEnginePath;
        console.log("vite: using local mist engine at ".concat(localEnginePath));
    }
    return {
        base: '/tc-home/',
        resolve: { alias: alias },
        // The dev server refuses to serve files outside the project root
        // (server.fs.allow) — and the local engine lives outside it. Widen the
        // allow list to exactly the aliased pkg dir (plus the project root) only
        // while MISTLIB_LOCAL is active; the production build is unaffected.
        server: {
            fs: {
                allow: localEnginePath ? [process.cwd(), localEnginePath] : undefined,
            },
        },
    };
});
