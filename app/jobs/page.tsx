'use client'

import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { WORKCHAIN_ESCROW_ADDRESS, WORKCHAIN_ESCROW_ABI } from '@/config/contracts'
import { ConnectWallet } from '../components/ConnectWallet'
import Link from 'next/link'

const PAYMENT_LABELS = ['One Time', 'Milestone', 'Recurring']
const STATUS_LABELS = ['Proposed', 'Active', 'Completed', 'Disputed', 'Resolved', 'Cancelled', 'Expired']
const STATUS_COLORS = [
  'bg-yellow-50 text-yellow-700 border-yellow-100',
  'bg-green-50 text-green-700 border-green-100',
  'bg-blue-50 text-blue-700 border-blue-100',
  'bg-red-50 text-red-700 border-red-100',
  'bg-purple-50 text-purple-700 border-purple-100',
  'bg-gray-50 text-gray-500 border-gray-100',
  'bg-orange-50 text-orange-700 border-orange-100',
]

function JobCard({ contractId, address }: { contractId: number, address?: string }) {
  const { data: contract } = useReadContract({
    address: WORKCHAIN_ESCROW_ADDRESS,
    abi: WORKCHAIN_ESCROW_ABI,
    functionName: 'getContract',
    args: [BigInt(contractId)],
  })

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  if (!contract) return null
  if (contract.status !== 0) return null // Only show Proposed contracts

  const amount = Number(contract.totalAmount) / 1e6
  const deadline = new Date(Number(contract.deadline) * 1000).toLocaleDateString()
  const isFreelancer = address?.toLowerCase() === contract.freelancer.toLowerCase()

  const handleAccept = () => {
    writeContract({
      address: WORKCHAIN_ESCROW_ADDRESS,
      abi: WORKCHAIN_ESCROW_ABI,
      functionName: 'signAndActivate',
      args: [BigInt(contractId)],
    })
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[contract.status]}`}>
              {STATUS_LABELS[contract.status]}
            </span>
            <span className="text-xs px-2 py-1 rounded-full border border-blue-100 bg-blue-50 text-blue-600 font-medium">
              {PAYMENT_LABELS[contract.paymentType]}
            </span>
          </div>
          <h3 className="font-display font-bold text-gray-900 text-lg">{contract.title}</h3>
        </div>
        <div className="text-right ml-4">
          <div className="font-display font-bold text-blue-600 text-xl">{amount.toFixed(2)}</div>
          <div className="text-xs text-gray-400">USDC</div>
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{contract.description}</p>

      <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
        <div className="flex items-center gap-1">
          <span>📅</span>
          <span>Due {deadline}</span>
        </div>
        <div className="flex items-center gap-1 font-mono">
          <span>👤</span>
          <span>{contract.client.slice(0, 6)}...{contract.client.slice(-4)}</span>
        </div>
      </div>

      {isFreelancer && (
        <div className="border-t border-gray-50 pt-4">
          {isSuccess ? (
            <div className="bg-green-50 text-green-700 text-sm text-center py-2 rounded-xl font-medium">
              ✅ Contract accepted! Funds locked in escrow.
            </div>
          ) : (
            <button
              onClick={handleAccept}
              disabled={isPending || isConfirming}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Activating...' : 'Accept Contract'}
            </button>
          )}
        </div>
      )}

      {!isFreelancer && address && (
        <div className="border-t border-gray-50 pt-4">
          <p className="text-xs text-gray-400 text-center">
            This contract is assigned to a specific freelancer
          </p>
        </div>
      )}

      {!address && (
        <div className="border-t border-gray-50 pt-4">
          <p className="text-xs text-gray-400 text-center">Connect wallet to accept contracts</p>
        </div>
      )}
    </div>
  )
}

export default function JobsPage() {
  const { address } = useAccount()
  const [filter, setFilter] = useState<'all' | 'mine'>('all')

  const { data: contractCount } = useReadContract({
    address: WORKCHAIN_ESCROW_ADDRESS,
    abi: WORKCHAIN_ESCROW_ABI,
    functionName: 'contractCount',
  })

  const count = contractCount ? Number(contractCount) : 0
  const contractIds = Array.from({ length: count }, (_, i) => i + 1)

  return (
    <main className="min-h-screen bg-[#f8faff]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Syne', sans-serif; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      {/* Navbar */}
      <header className="border-b border-gray-100 bg-white px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">W</span>
            </div>
            <span className="font-display font-bold text-gray-900">WorkChain</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/post-contract"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Post a Job
            </Link>
            <ConnectWallet />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">
              Open Contracts
            </h1>
            <p className="text-gray-400">
              Browse and accept contracts — payments locked in escrow.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All Jobs
            </button>
            <button
              onClick={() => setFilter('mine')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'mine' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Assigned to Me
            </button>
          </div>
        </div>

        {/* Job grid */}
        {count === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="font-display font-bold text-gray-900 text-xl mb-2">No contracts yet</h3>
            <p className="text-gray-400 text-sm mb-6">Be the first to post a job on WorkChain.</p>
            <Link
              href="/post-contract"
              className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Post a Job
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contractIds.map((id) => (
              <JobCard key={id} contractId={id} address={address} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}