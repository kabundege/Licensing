import * as yup from 'yup';

export const applicationStatusParamsSchema = yup
  .object({
    applicationId: yup.string().uuid().required(),
  })
  .required();

export type ApplicationStatusParamsDto = yup.InferType<
  typeof applicationStatusParamsSchema
>;
