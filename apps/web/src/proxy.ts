import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Contrôle optimiste (présence du cookie) : la vraie vérification de session se fait côté serveur.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Tout sauf la connexion, l'API, les fichiers de Next et ceux de la PWA.
  matcher: [
    "/((?!connexion|api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|apple-icon).*)",
  ],
};
