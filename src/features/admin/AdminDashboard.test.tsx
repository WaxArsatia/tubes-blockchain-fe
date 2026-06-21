// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { RoleCheckboxes } from "@/features/admin/AdminDashboard"
import { usePendingActionKeys } from "@/hooks/usePendingActionKeys"

const accountA = `0x${"1".repeat(40)}` as const
const accountB = `0x${"2".repeat(40)}` as const

function RoleHarness() {
  const { pendingKeys, run } = usePendingActionKeys()
  return (
    <>
      <RoleCheckboxes
        account={accountA}
        activeRoles={[]}
        pendingKeys={pendingKeys}
        onChange={(key) =>
          run(
            key,
            () =>
              new Promise<void>((resolve) => {
                resolvers.set(key, resolve)
              })
          )
        }
      />
      <RoleCheckboxes
        account={accountB}
        activeRoles={[]}
        pendingKeys={pendingKeys}
        onChange={(key) =>
          run(
            key,
            () =>
              new Promise<void>((resolve) => {
                resolvers.set(key, resolve)
              })
          )
        }
      />
    </>
  )
}

const resolvers = new Map<string, () => void>()

describe("RoleCheckboxes", () => {
  it("keeps earlier role updates disabled while a later update completes", async () => {
    render(<RoleHarness />)
    const roleA = screen.getByRole("checkbox", {
      name: /Admin untuk 0x1111/,
    })
    const roleB = screen.getByRole("checkbox", {
      name: /Faskes untuk 0x2222/,
    })

    fireEvent.click(roleA)
    fireEvent.click(roleB)

    await waitFor(() => {
      expect(resolvers.size).toBe(2)
      expect(
        screen
          .getByRole("checkbox", { name: /Admin untuk 0x1111/ })
          .getAttribute("aria-disabled")
      ).toBe("true")
      expect(
        screen
          .getByRole("checkbox", { name: /Faskes untuk 0x2222/ })
          .getAttribute("aria-disabled")
      ).toBe("true")
    })

    const secondKey = [...resolvers.keys()].find((key) =>
      key.includes(accountB.toLowerCase())
    )
    await act(async () => resolvers.get(secondKey ?? "")?.())

    expect(
      screen
        .getByRole("checkbox", { name: /Admin untuk 0x1111/ })
        .getAttribute("aria-disabled")
    ).toBe("true")
    expect(
      screen
        .getByRole("checkbox", { name: /Faskes untuk 0x2222/ })
        .getAttribute("aria-disabled")
    ).not.toBe("true")
  })
})
