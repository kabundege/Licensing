import axios from "axios";

import {
  REQUEST_TIMEOUT_DURATION,
  REQUEST_TIMEOUT_MESSAGE,
} from "@/constants";
import { getApiBaseUrl } from "@/lib/api-url";

const options = {
  baseURL: getApiBaseUrl(),
  headers: {
    Accept: `application/json`,
  },
  timeout: REQUEST_TIMEOUT_DURATION,
  timeoutErrorMessage: REQUEST_TIMEOUT_MESSAGE,
};

const axiosInstance = axios.create(options);

axiosInstance.interceptors.request.use(async (request) => {
  if (typeof window === `undefined`) {
    return request;
  }
  const { getSession } = await import(`next-auth/react`);
  const session = await getSession();
  const token = session?.accessToken;
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }
  return request;
});

/** Client-side API instance (Bearer from NextAuth session in the browser). */
export default axiosInstance;
