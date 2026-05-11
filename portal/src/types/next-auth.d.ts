import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: DefaultSession["user"] & {
      id: string;
      permissions: string[];
      roles: string[];
    };
  }

  interface User {
    accessToken: string;
    permissions: string[];
    roles: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    permissions?: string[];
    roles?: string[];
  }
}
