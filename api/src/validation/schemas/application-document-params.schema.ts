import * as yup from 'yup';

export const applicationDocumentParamsSchema = yup
  .object({
    applicationId: yup.string().uuid().required(),
  })
  .required();

export type ApplicationDocumentParamsDto = yup.InferType<
  typeof applicationDocumentParamsSchema
>;
