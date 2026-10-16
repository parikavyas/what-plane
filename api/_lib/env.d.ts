// Vercel functions run on Node; we only touch process.env, so declare just that
// instead of pulling in all of @types/node.
declare const process: { env: Record<string, string | undefined> };
