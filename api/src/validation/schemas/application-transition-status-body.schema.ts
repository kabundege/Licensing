import * as yup from 'yup';

import { ApplicationStatus } from '../../modules/applications/entities';

const applicationStatuses = Object.values(ApplicationStatus);

export const applicationTransitionStatusBodySchema = yup
  .object({
    targetStatus: yup.string().oneOf(applicationStatuses).required(),
    expectedVersion: yup.number().integer().min(0).required(),
  })
  .required();

export type ApplicationTransitionStatusBodyDto = yup.InferType<
  typeof applicationTransitionStatusBodySchema
>;
