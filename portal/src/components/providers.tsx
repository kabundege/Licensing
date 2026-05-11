"use client";

import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import ReactQueryProvider from "@/providers/ReactQueryProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ReactQueryProvider>
        <TooltipProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: `border-border bg-card text-card-foreground`,
              },
            }}
          />
        </TooltipProvider>
      </ReactQueryProvider>
    </SessionProvider>
  );
}
