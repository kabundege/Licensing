import * as yup from "yup";

export const registerValidationSchema = yup.object({
  name: yup
    .string()
    .trim()
    .min(2, `Name must be at least 2 characters`)
    .required(`Name is required`),
  email: yup
    .string()
    .trim()
    .email(`Enter a valid email`)
    .required(`Email is required`),
  password: yup
    .string()
    .min(8, `Password must be at least 8 characters`)
    .required(`Password is required`),
});

export type RegisterBodyDto = yup.InferType<typeof registerValidationSchema>;
