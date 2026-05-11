import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { decodeJwt } from "jose";

import routes from "@/constants/routeNames";
import { getApiBaseUrl } from "@/lib/api-url";
import { loginUser } from "@/lib/services/auth.service";

type AccessTokenClaims = {
  sub?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
};

const resolveAuthSecret = (): string | undefined => {
  const fromEnv = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === `production`) {
    return undefined;
  }
  return `development-only-change-me-min-32-chars-authjs`;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: resolveAuthSecret(),
  session: { strategy: `jwt`, maxAge: 60 * 60 * 12 },
  pages: {
    signIn: routes.login.url,
  },
  providers: [
    Credentials({
      name: `Credentials`,
      credentials: {
        email: { label: `Email`, type: `email` },
        password: { label: `Password`, type: `password` },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== `string` || typeof password !== `string`) {
          return null;
        }

        try {
          getApiBaseUrl();
          const data = await loginUser({ email, password });
          const token = data.token;
          if (typeof token !== `string` || !token) {
            return null;
          }

          const claims = decodeJwt(token) as AccessTokenClaims;
          const sub = claims.sub;
          const tokenEmail = claims.email;
          if (!sub || !tokenEmail) {
            return null;
          }

          return {
            id: sub,
            email: tokenEmail,
            accessToken: token,
            permissions: claims.permissions ?? [],
            roles: claims.roles ?? [],
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.accessToken = user.accessToken;
        token.permissions = user.permissions;
        token.roles = user.roles;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ``;
        session.user.email = token.email ?? session.user.email ?? ``;
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.roles = (token.roles as string[]) ?? [];
      }
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
});
