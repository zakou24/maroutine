import { createAuthClient } from "better-auth/react";

// Même origine que l'app : pas de baseURL à configurer côté client.
export const authClient = createAuthClient();
