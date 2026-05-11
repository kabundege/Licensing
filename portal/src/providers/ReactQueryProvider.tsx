"use client";

import {
  asyncStoragePersister,
  dehydratedState,
  queryClient,
} from "@/config/tantask.config";
import {
  HydrationBoundary,
  QueryClientProvider,
} from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";

const ReactQueryProvider = ({ children }: { children: ReactNode }) => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister: asyncStoragePersister }}
    onSuccess={() => {
      void queryClient.resumePausedMutations().then(() => {
        void queryClient.invalidateQueries();
      });
    }}
  >
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>{children}</HydrationBoundary>
    </QueryClientProvider>
  </PersistQueryClientProvider>
);

export default ReactQueryProvider;
