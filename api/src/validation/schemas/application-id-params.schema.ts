import * as yup from 'yup';

export const applicationIdParamsSchema = yup
  .object({
    id: yup.string().uuid().required(),
  })
  .required();

export type ApplicationIdParamsDto = yup.InferType<typeof applicationIdParamsSchema>;
