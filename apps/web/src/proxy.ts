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
  // Tout sauf la connexion, l'API, les fichiers de Next, ceux de la PWA et le lecteur de codes-barres.
  // Chaque exclusion est ancrée : /apixyz ou /icons-test restent protégés.
  matcher: [
    "/((?!(?:connexion|api|icons|zxing|_next/static|_next/image)(?:/|$)|(?:favicon\\.ico|manifest\\.webmanifest|robots\\.txt|apple-icon(?:\\.png)?)$).*)",
  ],
};
