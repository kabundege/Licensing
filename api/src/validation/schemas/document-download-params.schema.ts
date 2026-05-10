import * as yup from 'yup';

export const documentDownloadParamsSchema = yup
  .object({
    id: yup.string().uuid().required(),
  })
  .required();

export type DocumentDownloadParamsDto = yup.InferType<
  typeof documentDownloadParamsSchema
>;
