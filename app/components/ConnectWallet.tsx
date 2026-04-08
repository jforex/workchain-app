'use client'

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'

export function ConnectWallet() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const isWrongNetwork = isConnected && chainId !== baseSepolia.id

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
        <span className="font-mono text-xs bg-gray-100 px-3 py-2 rounded-lg text-gray-600">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-xl transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={isConnecting}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition-colors"
        >
          {connector.name === 'Injected' ? '🦊 MetaMask' : '🔵 Base Account'}
        </button>
      ))}
    </div>
  )
}