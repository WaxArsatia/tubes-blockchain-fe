import "viem/window"
import { useCallback, useEffect, useState } from "react"

import { addEthereumChainParameter } from "@/config/chain"
import { env } from "@/config/env"

export function useWallet() {
  const [account, setAccount] = useState<`0x${string}` | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const hasProvider = typeof window !== "undefined" && Boolean(window.ethereum)
  const isCorrectChain = chainId === env.VITE_CHAIN_ID_HEX

  const refresh = useCallback(async () => {
    if (!window.ethereum) return
    const [accounts, currentChainId] = await Promise.all([
      window.ethereum.request({ method: "eth_accounts" }),
      window.ethereum.request({ method: "eth_chainId" }),
    ])
    setAccount(accounts[0] ?? null)
    setChainId(currentChainId)
  }, [])

  const connect = useCallback(async () => {
    if (!window.ethereum) return
    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })
      setAccount(accounts[0] ?? null)
      await refresh()
    } finally {
      setIsConnecting(false)
    }
  }, [refresh])

  const switchOrAddChain = useCallback(async () => {
    if (!window.ethereum) return
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: env.VITE_CHAIN_ID_HEX }],
      })
    } catch (error) {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        Number(error.code) === 4902
      ) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [addEthereumChainParameter],
        })
      } else {
        throw error
      }
    } finally {
      await refresh()
    }
  }, [refresh])

  useEffect(() => {
    void refresh()
    if (!window.ethereum) return

    const onAccountsChanged = (accounts: unknown) => {
      setAccount(
        Array.isArray(accounts)
          ? ((accounts[0] as `0x${string}` | undefined) ?? null)
          : null
      )
    }
    const onChainChanged = (nextChainId: unknown) =>
      setChainId(String(nextChainId))

    window.ethereum.on("accountsChanged", onAccountsChanged)
    window.ethereum.on("chainChanged", onChainChanged)
    return () => {
      window.ethereum?.removeListener("accountsChanged", onAccountsChanged)
      window.ethereum?.removeListener("chainChanged", onChainChanged)
    }
  }, [refresh])

  return {
    account,
    chainId,
    hasProvider,
    isCorrectChain,
    isConnecting,
    connect,
    switchOrAddChain,
  }
}
