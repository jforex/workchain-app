'use client'

import { useParams } from 'next/navigation'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { WORKCHAIN_ESCROW_ADDRESS, WORKCHAIN_ESCROW_ABI } from '@/config/contracts'
import { ConnectWallet } from '../../components/ConnectWallet'
import Link from 'next/link'
import { useState } from 'react'

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

export default function ContractDetail() {
  const { id } = useParams()
  const { address } = useAccount()
  const [submitted, setSubmitted] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'applications'>('overview')

  const { data: contract, refetch } = useReadContract({
    address: WORKCHAIN_ESCROW_ADDRESS,
    abi: WORKCHAIN_ESCROW_ABI,
    functionName: 'getContract',
    args: [BigInt(id as string)],
  })

  const { data: milestones } = useReadContract({
    address: WORKCHAIN_ESCROW_ADDRESS,
    abi: WORKCHAIN_ESCROW_ABI,
    functionName: 'getMilestones',
    args: [BigInt(id as string)],
  })

  const { data: applications } = useReadContract({
    address: WORKCHAIN_ESCROW_ADDRESS,
    abi: WORKCHAIN_ESCROW_ABI,
    functionName: 'getApplications',
    args: [BigInt(id as string)],
  })

  const { writeContract, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt()

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading contract...</div>
      </div>
    )
  }

  const isClient = address?.toLowerCase() === contract.client.toLowerCase()
  const isFreelancer = address?.toLowerCase() === contract.freelancer.toLowerCase()
  const isOpen = contract.contractType === 0
  const amount = Number(contract.totalAmount) / 1e6
  const deadline = new Date(Number(contract.deadline) * 1000).toLocaleDateString()
  const createdAt = new Date(Number(contract.createdAt) * 1000).toLocaleDateString()

  const handleAction = (functionName: string, args: unknown[] = []) => {
    writeContract({
      address: WORKCHAIN_ESCROW_ADDRESS,
      abi: WORKCHAIN_ESCROW_ABI,
      functionName: functionName as any,
      args: args as any,
    }, {
      onSuccess: () => {
        setSubmitted(true)
        setTimeout(() => {
          setSubmitted(false)
          refetch()
        }, 3000)
      }
    })
  }

  return (
    <main className="min-h-screen bg-[#f8faff]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Syne', sans-serif; }
        input, textarea {
          color: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
        }
        input::placeholder, textarea::placeholder {
          color: #9ca3af !important;
          -webkit-text-fill-color: #9ca3af !important;
        }
      `}</style>

      {/* Header */}
      <header className="border-b border-gray-100 bg-white px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/jobs" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
              ← Job Board
            </Link>
            <span className="text-gray-200">/</span>
            <span className="text-sm text-gray-600 font-medium">Contract #{id}</span>
          </div>
          <ConnectWallet />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Contract header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className={`text-xs px-3 py-1 rounded-full border font-medium ${STATUS_COLORS[contract.status]}`}>
                  {STATUS_LABELS[contract.status]}
                </span>
                <span className="text-xs px-3 py-1 rounded-full border border-blue-100 bg-blue-50 text-blue-600 font-medium">
                  {PAYMENT_LABELS[contract.paymentType]}
                </span>
                <span className={`text-xs px-3 py-1 rounded-full border font-medium ${
                  isOpen ? 'bg-green-50 text-green-700 border-green-100' : 'bg-purple-50 text-purple-700 border-purple-100'
                }`}>
                  {isOpen ? '🌐 Open' : '🎯 Direct'}
                </span>
                {contract.category && (
                  <span className="text-xs px-3 py-1 rounded-full border border-gray-100 bg-gray-50 text-gray-500 font-medium">
                    {contract.category}
                  </span>
                )}
              </div>
              <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">{contract.title}</h1>
              <p className="text-gray-400 text-sm leading-relaxed">{contract.description}</p>
            </div>
            <div className="text-right ml-8 shrink-0">
              <div className="font-display font-bold text-blue-600 text-3xl">{amount.toFixed(2)}</div>
              <div className="text-sm text-gray-400">USDC</div>
            </div>
          </div>

          {/* Contract info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-50">
            {[
              { label: 'Client', value: `${contract.client.slice(0, 6)}...${contract.client.slice(-4)}` },
              { label: 'Freelancer', value: contract.freelancer === '0x0000000000000000000000000000000000000000' ? 'Not assigned' : `${contract.freelancer.slice(0, 6)}...${contract.freelancer.slice(-4)}` },
              { label: 'Deadline', value: deadline },
              { label: 'Posted', value: createdAt },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                <div className="text-sm font-medium text-gray-900 font-mono">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Success message */}
        {submitted && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-700 mb-6 text-center font-medium">
            ✅ Transaction submitted successfully!
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1 mb-6 w-fit">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'milestones', label: `Milestones ${milestones?.length ? `(${milestones.length})` : ''}` },
            { key: 'applications', label: `Applications ${applications?.length ? `(${applications.length})` : ''}` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">

            {/* Client actions */}
            {isClient && contract.status === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-display font-bold text-gray-900 mb-4">Client Actions</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction('cancelContract', [BigInt(id as string)])}
                    disabled={isPending || isConfirming}
                    className="px-6 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel Contract
                  </button>
                </div>
              </div>
            )}

            {/* Freelancer actions — Direct contract */}
            {isFreelancer && contract.status === 0 && !isOpen && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-display font-bold text-gray-900 mb-2">Accept Contract</h3>
                <p className="text-gray-400 text-sm mb-4">
                  By accepting, you agree to the terms. USDC will be locked in escrow from the client.
                </p>
                <button
                  onClick={() => handleAction('signAndActivate', [BigInt(id as string)])}
                  disabled={isPending || isConfirming}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Confirm in Wallet...' : 'Accept & Activate Contract'}
                </button>
              </div>
            )}

            {/* Active contract actions */}
            {contract.status === 1 && (isClient || isFreelancer) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-display font-bold text-gray-900 mb-4">Contract Actions</h3>
                <div className="flex flex-wrap gap-3">
                  {isClient && contract.paymentType === 0 && (
                    <button
                      onClick={() => handleAction('releaseMilestone', [BigInt(id as string), BigInt(0)])}
                      disabled={isPending || isConfirming}
                      className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      ✅ Release Payment
                    </button>
                  )}
                  <button
                    onClick={() => handleAction('raiseDispute', [BigInt(id as string)])}
                    disabled={isPending || isConfirming}
                    className="px-6 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    🚨 Raise Dispute
                  </button>
                  <button
                    onClick={() => {
                      const newDeadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
                      handleAction('requestExtension', [BigInt(id as string), BigInt(newDeadline)])
                    }}
                    disabled={isPending || isConfirming}
                    className="px-6 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    ⏳ Request Extension
                  </button>
                </div>
              </div>
            )}

            {/* Contract timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-display font-bold text-gray-900 mb-4">Contract Timeline</h3>
              <div className="space-y-3">
                {[
                  { label: 'Contract created', date: createdAt, done: true },
                  { label: 'Freelancer assigned', date: contract.freelancer !== '0x0000000000000000000000000000000000000000' ? 'Assigned' : 'Pending', done: contract.freelancer !== '0x0000000000000000000000000000000000000000' },
                  { label: 'Contract activated', date: contract.status >= 1 ? 'Activated' : 'Pending', done: contract.status >= 1 },
                  { label: 'Work completed', date: contract.status >= 2 ? 'Completed' : 'Pending', done: contract.status >= 2 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                      item.done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {item.done ? '✓' : i + 1}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <span className="text-xs text-gray-400">{item.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Milestones tab */}
        {activeTab === 'milestones' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-display font-bold text-gray-900 mb-4">Milestones</h3>
            {!milestones || milestones.length === 0 ? (
              <p className="text-gray-400 text-sm">No milestones set for this contract.</p>
            ) : (
              <div className="space-y-3">
                {milestones.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        m.released ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {m.released ? '✓' : i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{m.description}</div>
                        <div className="text-xs text-gray-400">Due {new Date(Number(m.deadline) * 1000).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-blue-600">{(Number(m.amount) / 1e6).toFixed(2)} USDC</span>
                      {isClient && !m.released && contract.status === 1 && (
                        <button
                          onClick={() => handleAction('releaseMilestone', [BigInt(id as string), BigInt(i)])}
                          disabled={isPending}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                        >
                          Release
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Applications tab */}
        {activeTab === 'applications' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-display font-bold text-gray-900 mb-4">Applications</h3>
            {!applications || applications.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-gray-400 text-sm">No applications yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app, i) => (
                  <div key={i} className={`p-5 rounded-xl border ${app.selected ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-mono text-sm text-gray-900 font-medium">
                          {app.freelancer.slice(0, 10)}...{app.freelancer.slice(-6)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Applied {new Date(Number(app.appliedAt) * 1000).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {app.proposedRate > 0 && (
                          <span className="text-sm font-bold text-blue-600">
                            {(Number(app.proposedRate) / 1e6).toFixed(2)} USDC
                          </span>
                        )}
                        {app.selected && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                            ✓ Selected
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{app.coverNote}</p>
                    {isClient && !app.selected && contract.status === 0 && (
                      <button
                        onClick={() => handleAction('selectFreelancer', [BigInt(id as string), app.freelancer])}
                        disabled={isPending || isConfirming}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl font-medium transition-colors disabled:opacity-50"
                      >
                        Select this Freelancer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}