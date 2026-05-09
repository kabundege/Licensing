import * as yup from 'yup';

export const EMAIL_MAX = 320;

export const emailField = (): yup.StringSchema<string> =>
  yup
    .string()
    .trim()
    .lowercase()
    .max(EMAIL_MAX)
    .email()
    .required();

export const signupPasswordField = (): yup.StringSchema<string> =>
  yup.string().required().min(8);

export const loginPasswordField = (): yup.StringSchema<string> =>
  yup.string().required();

export const displayNameField = (): yup.StringSchema<string> =>
  yup.string().trim().required().min(2);
