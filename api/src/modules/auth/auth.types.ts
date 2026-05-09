import type { RoleName } from './entities';

export interface LoadedAuthUser {
  id: string;
  email: string;
  role: RoleName;
  permissionTokens: string[];
}
