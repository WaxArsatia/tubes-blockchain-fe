import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TransactionProvider } from "@/app/TransactionProvider"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 8_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TransactionProvider>
        <TooltipProvider delay={250}>
          {children}
          <Toaster richColors closeButton />
        </TooltipProvider>
      </TransactionProvider>
    </QueryClientProvider>
  )
}
