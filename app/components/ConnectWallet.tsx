'use client'

import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'

export function ConnectWallet() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [showDropdown, setShowDropdown] = useState(false)

  const isWrongNetwork = isConnected && chainId !== baseSepolia.id

  // Get unique connectors by type
  const injected = connectors.find((c) => c.name === 'Injected' || c.type === 'injected')
  const baseAcc = connectors.find((c) => c.name === 'Base Account' || c.type === 'baseAccount')

  const walletOptions = [
    injected && { connector: injected, label: '🦊 MetaMask / Rabby' },
    baseAcc && { connector: baseAcc, label: '🔵 Base Account' },
  ].filter(Boolean) as { connector: typeof connectors[0], label: string }[]

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        {isWrongNetwork && (
          <button
            onClick={() => switchChain({ chainId: baseSepolia.id })}
            disabled={isSwitching}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-xl transition-colors"
          >
            {isSwitching ? 'Switching...' : '⚠️ Switch to Base Sepolia'}
          </button>
        )}
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

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isConnecting}
        className="px-5 py-2 bg-white text-blue-600 font-medium text-sm rounded-xl hover:bg-blue-50 transition-colors shadow-sm disabled:opacity-50"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-12 bg-white border border-gray-100 rounded-2xl shadow-xl p-2 z-50 min-w-[200px]">
          {walletOptions.map(({ connector, label }) => (
            <button
              key={connector.uid}
              onClick={() => {
                connect({ connector })
                setShowDropdown(false)
              }}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}