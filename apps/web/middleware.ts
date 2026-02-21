// middleware.ts is now a no-op since we're using react-i18next for client-side translations
// If you need middleware for other purposes, you can add it here

import { NextResponse } from "next/server";
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
