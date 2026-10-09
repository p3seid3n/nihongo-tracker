// Loads the SQLite engine (sql.js). The .wasm file is bundled with the app and served from
// your own domain, so importing works offline and does not depend on any CDN.
let promise = null;
export function loadSQL() {
  if (!promise) {
    promise = (async () => {
      const [{ default: wasmUrl }, mod] = await Promise.all([
        import("sql.js/dist/sql-wasm.wasm?url"),
        import("sql.js/dist/sql-wasm.js"),
      ]);
      const initSqlJs = mod.default || mod;
      return initSqlJs({ locateFile: () => wasmUrl });
    })().catch((e) => { promise = null; throw e; });
  }
  return promise;
}
