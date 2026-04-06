'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function ConnectWallet() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isReconnecting) return null

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: connectors[0] })}
        disabled={isConnecting}
        className="px-5 py-2 bg-white text-blue-600 font-medium text-sm rounded-xl hover:bg-blue-50 transition-colors shadow-sm disabled:opacity-50"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-2 rounded-lg text-white">
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </span>
      <button
        onClick={() => disconnect()}
        className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white text-xs rounded-xl transition-colors"
      >
        Disconnect
      </button>
    </div>
  )
}