export type LoginApiResponse = {
  success?: boolean;
  token?: string;
};

export type SignupApiResponse = {
  success?: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    roles: string[];
  };
};
