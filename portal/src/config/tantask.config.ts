import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { AxiosError } from "axios";
import { dehydrate, MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { QUERY_CACHE_DURATION } from "@/constants";

type ApiErrorBody = { message?: string };

const asyncStorage = {
  getItem: (key: string) => {
    if (typeof window === `undefined`) {
      return Promise.resolve(null);
    }
    return Promise.resolve(window.localStorage.getItem(key));
  },
  setItem: (key: string, value: string) => {
    if (typeof window === `undefined`) {
      return Promise.resolve();
    }
    window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window === `undefined`) {
      return Promise.resolve();
    }
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: QUERY_CACHE_DURATION,
    },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error instanceof AxiosError) {
        const data = error.response?.data as ApiErrorBody | undefined;
        const msg = data?.message;
        toast.error(typeof msg === `string` ? msg : error.message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      }
    },
  }),
});

export const asyncStoragePersister = createAsyncStoragePersister({
  key: `bnr-portal-react-query`,
  throttleTime: 1000,
  storage: asyncStorage,
});

export const dehydratedState = dehydrate(queryClient, {
  shouldDehydrateQuery: () => true,
  shouldDehydrateMutation: () => true,
});
