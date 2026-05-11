const routes = {
  login: {
    url: `/login`,
    label: `Sign in`,
    isProtected: false,
    isDefaultPath: false,
  },
  register: {
    url: `/register`,
    label: `Create account`,
    isProtected: false,
    isDefaultPath: false,
  },
  dashboard: {
    url: `/dashboard`,
    label: `Overview`,
    isProtected: true,
    isDefaultPath: false,
  },
  newApplication: {
    url: `/dashboard/applications/new`,
    label: `New Application`,
    isProtected: true,
    isDefaultPath: false,
  },
  staffReview: {
    url: `/dashboard/staff/review`,
    label: `Staff Review Queue`,
    isProtected: true,
    isDefaultPath: false,
  },
  admin: {
    url: `/dashboard/admin`,
    label: `Admin Dashboard`,
    isProtected: true,
    isDefaultPath: false,
  },
} as const;

export default routes;
