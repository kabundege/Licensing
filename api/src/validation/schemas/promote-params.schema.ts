import * as yup from 'yup';

export const promoteParamsSchema = yup
  .object({
    userId: yup.string().uuid().required(),
  })
  .required();

export type PromoteParamsDto = yup.InferType<typeof promoteParamsSchema>;
