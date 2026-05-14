/**
 * app/api/auth/[...nextauth]/route.ts
 *
 * Auth.js v5 route handler.
 * Simply re-exports the GET and POST handlers from our central auth config.
 * All /api/auth/* requests (signin, callback, signout, session, csrf) are
 * handled automatically by Auth.js via these two exports.
 */

export { GET, POST } from "@/lib/auth";
