import * as yup from 'yup';

import { RoleName } from '../../modules/auth/entities';

export const promoteBodySchema = yup
  .object({
    role: yup
      .string()
      .oneOf([RoleName.REVIEWER, RoleName.APPROVER])
      .required(),
  })
  .required();

export type PromoteBodyDto = yup.InferType<typeof promoteBodySchema>;
