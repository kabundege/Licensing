import * as yup from 'yup';

import { emailField, loginPasswordField } from './fields.schema';

export const loginBodySchema = yup
  .object({
    email: emailField(),
    password: loginPasswordField(),
  })
  .required();

export type LoginBodyDto = yup.InferType<typeof loginBodySchema>;
