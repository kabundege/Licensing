import type { RoleName } from './entities';

/** Populated on `req.user` after `requireJwt` loads the row from the database. */
export interface LoadedAuthUser {
  id: string;
  email: string;
  role: RoleName;
  permissionTokens: string[];
}
