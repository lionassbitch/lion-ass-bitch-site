// Resolve hook so `node --test` can import the app's TypeScript source, which
// uses bundler-style extensionless relative imports (e.g. `./site`). Node's
// built-in type stripping handles the `.ts` contents; this only teaches the
// resolver to try the `.ts` / `.tsx` / `/index.ts` forms when a bare specifier
// has no extension.
export async function resolve(specifier, context, next) {
  const hasExtension = /\.[a-z0-9]+$/i.test(specifier);
  const isRelative = specifier.startsWith(".") || specifier.startsWith("/");

  if (!isRelative || hasExtension) {
    return next(specifier, context);
  }

  for (const candidate of [`${specifier}.ts`, `${specifier}.tsx`, `${specifier}/index.ts`]) {
    try {
      return await next(candidate, context);
    } catch {
      // try the next candidate
    }
  }

  return next(specifier, context);
}
