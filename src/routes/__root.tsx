import { Suspense, lazy } from "react"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

import { AppProviders } from "@/app/providers"

import appCss from "../styles.css?url"

const TanStackDevtools = import.meta.env.DEV
  ? lazy(() => import("@/components/TanStackDevtools"))
  : null

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "BPJS Rekam Medis",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
        {TanStackDevtools ? (
          <Suspense fallback={null}>
            <TanStackDevtools />
          </Suspense>
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
