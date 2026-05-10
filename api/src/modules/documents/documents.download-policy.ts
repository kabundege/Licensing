import type { LoadedAuthUser } from '../auth/auth.types';
import { RoleName } from '../auth/entities';

export const userMayDownloadApplicationDocument = (
  viewer: LoadedAuthUser,
  applicantUserId: string
): boolean => {
  if (viewer.id === applicantUserId) {
    return true;
  }
  const roles = new Set(viewer.roles);
  return roles.has(RoleName.REVIEWER) || roles.has(RoleName.APPROVER);
};
