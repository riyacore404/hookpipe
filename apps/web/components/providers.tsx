'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  // useState so each browser tab gets its own QueryClient
  // if you put it outside, all tabs share state — causes bugs
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10 * 1000,    // data stays fresh for 10 seconds
        refetchOnWindowFocus: true, // refetches when you tab back in
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}