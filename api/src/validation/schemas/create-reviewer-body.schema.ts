import type { SignupBodyDto } from './signup-body.schema';
import { signupBodySchema } from './signup-body.schema';

export const createReviewerBodySchema = signupBodySchema;
export type CreateReviewerBodyDto = SignupBodyDto;
