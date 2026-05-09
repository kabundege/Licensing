import * as yup from 'yup';

import {
  displayNameField,
  emailField,
  signupPasswordField,
} from './fields.schema';

export const signupBodySchema = yup
  .object({
    email: emailField(),
    password: signupPasswordField(),
    name: displayNameField(),
  })
  .required();

export type SignupBodyDto = yup.InferType<typeof signupBodySchema>;
