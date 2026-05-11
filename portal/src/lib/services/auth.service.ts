import axios from "axios";

import {
  REQUEST_TIMEOUT_DURATION,
  REQUEST_TIMEOUT_MESSAGE,
} from "@/constants";
import type { LoginApiResponse, SignupApiResponse } from "@/lib/types/api.type";
import { getApiBaseUrl } from "@/lib/api-url";
import type { LoginBodyDto } from "@/validation/auth.validation";
import type { RegisterBodyDto } from "@/validation/register.validation";

export const loginUser = async (
  body: LoginBodyDto,
): Promise<LoginApiResponse> => {
  const base = getApiBaseUrl();
  const res = await axios.post<LoginApiResponse>(
    `${base}/api/auth/login`,
    body,
    {
      headers: { "Content-Type": `application/json` },
      timeout: REQUEST_TIMEOUT_DURATION,
      timeoutErrorMessage: REQUEST_TIMEOUT_MESSAGE,
    },
  );
  return res.data;
};

export const signupUser = async (
  body: RegisterBodyDto,
): Promise<SignupApiResponse> => {
  const base = getApiBaseUrl();
  const res = await axios.post<SignupApiResponse>(
    `${base}/api/auth/signup`,
    {
      email: body.email.trim().toLowerCase(),
      password: body.password,
      name: body.name.trim(),
    },
    {
      headers: { "Content-Type": `application/json` },
      timeout: REQUEST_TIMEOUT_DURATION,
      timeoutErrorMessage: REQUEST_TIMEOUT_MESSAGE,
    },
  );
  return res.data;
};
