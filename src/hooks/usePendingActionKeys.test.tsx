// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { Button } from "@/components/ui/button"
import { usePendingActionKeys } from "@/hooks/usePendingActionKeys"

function PendingHarness({
  actions,
}: {
  actions: Record<string, () => Promise<void>>
}) {
  const { isPending, run } = usePendingActionKeys()
  const [completed, setCompleted] = useState<string[]>([])

  return (
    <>
      {Object.entries(actions).map(([key, action]) => (
        <Button
          key={key}
          disabled={isPending(key)}
          onClick={() =>
            void run(key, action).then(() =>
              setCompleted((current) => [...current, key])
            )
          }
        >
          {key}
        </Button>
      ))}
      <output>{completed.join(",")}</output>
    </>
  )
}

describe("usePendingActionKeys", () => {
  it("keeps every unresolved key pending when operations overlap", async () => {
    let resolveFirst: (() => void) | undefined
    let resolveSecond: (() => void) | undefined
    const actions = {
      first: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve
          })
      ),
      second: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSecond = resolve
          })
      ),
    }
    render(<PendingHarness actions={actions} />)

    fireEvent.click(screen.getByRole("button", { name: "first" }))
    fireEvent.click(screen.getByRole("button", { name: "second" }))

    expect(
      screen.getByRole("button", { name: "first" }).hasAttribute("disabled")
    ).toBe(true)
    expect(
      screen.getByRole("button", { name: "second" }).hasAttribute("disabled")
    ).toBe(true)

    await act(async () => resolveSecond?.())

    expect(
      screen.getByRole("button", { name: "first" }).hasAttribute("disabled")
    ).toBe(true)
    expect(
      screen.getByRole("button", { name: "second" }).hasAttribute("disabled")
    ).toBe(false)

    fireEvent.click(screen.getByRole("button", { name: "first" }))
    expect(actions.first).toHaveBeenCalledOnce()

    await act(async () => resolveFirst?.())
  })
})
