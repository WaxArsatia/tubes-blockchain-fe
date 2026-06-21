import { defineChain } from "viem"

import { env } from "./env"

export const bpjsChain = defineChain({
  id: env.VITE_CHAIN_ID,
  name: env.VITE_CHAIN_NAME,
  nativeCurrency: {
    name: env.VITE_NATIVE_CURRENCY_NAME,
    symbol: env.VITE_NATIVE_CURRENCY_SYMBOL,
    decimals: env.VITE_NATIVE_CURRENCY_DECIMALS,
  },
  rpcUrls: {
    default: { http: [env.VITE_RPC_URL] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: env.VITE_BLOCKSCOUT_URL,
    },
  },
})

export const addEthereumChainParameter = {
  chainId: env.VITE_CHAIN_ID_HEX,
  chainName: env.VITE_CHAIN_NAME,
  rpcUrls: [env.VITE_RPC_URL],
  nativeCurrency: {
    name: env.VITE_NATIVE_CURRENCY_NAME,
    symbol: env.VITE_NATIVE_CURRENCY_SYMBOL,
    decimals: env.VITE_NATIVE_CURRENCY_DECIMALS,
  },
  blockExplorerUrls: [env.VITE_BLOCKSCOUT_URL],
}
