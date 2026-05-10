import type { RoleName } from './entities';

export interface LoadedAuthUser {
  id: string;
  email: string;
  roles: RoleName[];
  permissions: string[];
}
