import * as yup from 'yup';

export type ApplicationDocumentsQueryDto = {
  includeHistory: boolean;
};

export const applicationDocumentsQuerySchema = yup
  .object({
    includeHistory: yup.string().oneOf([`true`, `false`]).optional(),
  })
  .required()
  .transform((root): ApplicationDocumentsQueryDto => ({
    includeHistory: root.includeHistory === `true`,
  }));
