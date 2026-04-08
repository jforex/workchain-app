'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { WORKCHAIN_ESCROW_ADDRESS, WORKCHAIN_ESCROW_ABI } from '@/config/contracts'
import { ConnectWallet } from '../components/ConnectWallet'
import Link from 'next/link'

type PaymentType = 'OneTime' | 'Milestone' | 'Recurring'
type ContractMode = 'Open' | 'Direct'

const CATEGORIES = ['Web Dev', 'Design', 'Writing', 'Video', 'Marketing', 'AI', 'Mobile', 'Other']

interface Milestone {
  description: string
  amount: string
  deadline: string
}

export default function PostContract() {
  const { address, isConnected } = useAccount()
  const [step, setStep] = useState(1)
  const [contractMode, setContractMode] = useState<ContractMode>('Open')
  const [paymentType, setPaymentType] = useState<PaymentType>('OneTime')
  const [form, setForm] = useState({
    freelancer: '',
    title: '',
    description: '',
    category: 'Web Dev',
    totalAmount: '',
    deadline: '',
    recurringAmount: '',
    recurringInterval: '30',
    recurringCount: '',
  })
  const [milestones, setMilestones] = useState<Milestone[]>([
    { description: '', amount: '', deadline: '' }
  ])

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const addMilestone = () => {
    setMilestones([...milestones, { description: '', amount: '', deadline: '' }])
  }

  const updateMilestone = (index: number, field: keyof Milestone, value: string) => {
    const updated = [...milestones]
    updated[index][field] = value
    setMilestones(updated)
  }

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index))
  }

  const getTotalAmount = () => {
    if (paymentType === 'Milestone') {
      return milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0).toString()
    }
    if (paymentType === 'Recurring') {
      return ((parseFloat(form.recurringAmount) || 0) * (parseInt(form.recurringCount) || 0)).toString()
    }
    return form.totalAmount
  }

  const handleSubmit = async () => {
    if (!isConnected) return

    const totalAmount = parseUnits(getTotalAmount() || '0', 6)
    const deadline = Math.floor(new Date(form.deadline).getTime() / 1000)
    const paymentTypeIndex = paymentType === 'OneTime' ? 0 : paymentType === 'Milestone' ? 1 : 2
    const recurringAmount = paymentType === 'Recurring' ? parseUnits(form.recurringAmount, 6) : BigInt(0)
    const recurringInterval = paymentType === 'Recurring' ? BigInt(parseInt(form.recurringInterval) * 24 * 60 * 60) : BigInt(0)
    const recurringCount = paymentType === 'Recurring' ? BigInt(parseInt(form.recurringCount)) : BigInt(0)

    if (contractMode === 'Open') {
      writeContract({
        address: WORKCHAIN_ESCROW_ADDRESS,
        abi: WORKCHAIN_ESCROW_ABI,
        functionName: 'postOpenJob',
        args: [
          form.title,
          form.description,
          form.category,
          paymentTypeIndex,
          totalAmount,
          BigInt(deadline),
          recurringAmount,
          recurringInterval,
          recurringCount,
        ],
      })
    } else {
      writeContract({
        address: WORKCHAIN_ESCROW_ADDRESS,
        abi: WORKCHAIN_ESCROW_ABI,
        functionName: 'proposeDirectContract',
        args: [
          form.freelancer as `0x${string}`,
          form.title,
          form.description,
          form.category,
          paymentTypeIndex,
          totalAmount,
          BigInt(deadline),
          recurringAmount,
          recurringInterval,
          recurringCount,
        ],
      })
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 text-center max-w-md shadow-sm border border-gray-100">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {contractMode === 'Open' ? 'Job Posted!' : 'Contract Proposed!'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {contractMode === 'Open'
              ? 'Your job is now live. Freelancers can browse and apply.'
              : 'Your contract has been proposed. The freelancer needs to sign and activate it.'}
          </p>
          <Link href="/jobs" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            View Job Board →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Syne', sans-serif; }
        input, textarea, select {
          color: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
          opacity: 1 !important;
        }
        input::placeholder, textarea::placeholder {
          color: #9ca3af !important;
          -webkit-text-fill-color: #9ca3af !important;
          opacity: 1 !important;
        }
      `}</style>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">W</span>
            </div>
            <span className="font-display font-bold text-gray-900">WorkChain</span>
          </Link>
          <ConnectWallet />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">Post a Job</h1>
          <p className="text-gray-400">Define the terms, payment structure, and deadlines.</p>
        </div>

        {/* Contract Mode Toggle */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            {
              mode: 'Open',
              label: 'Open Job Post',
              desc: 'Post publicly — freelancers browse and apply. You pick the best fit.',
              icon: '🌐',
            },
            {
              mode: 'Direct',
              label: 'Direct Contract',
              desc: 'Already know who you want? Send a contract directly to their wallet.',
              icon: '🎯',
            },
          ].map((m) => (
            <button
              key={m.mode}
              onClick={() => setContractMode(m.mode as ContractMode)}
              className={`p-5 rounded-2xl border-2 text-left transition-all ${
                contractMode === m.mode
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div className="text-2xl mb-2">{m.icon}</div>
              <div className="font-display font-bold text-gray-900 text-sm mb-1">{m.label}</div>
              <div className="text-xs text-gray-400 leading-relaxed">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step >= s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {s}
              </div>
              {s < 3 && <div className={`w-16 h-px ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
          <div className="ml-4 text-sm text-gray-400">
            {step === 1 ? 'Basic details' : step === 2 ? 'Payment structure' : 'Review & submit'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {/* Step 1: Basic Details */}
          {step === 1 && (
            <div className="space-y-6">
              {contractMode === 'Direct' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Freelancer Wallet Address</label>
                  <input
                    type="text"
                    value={form.freelancer}
                    onChange={(e) => setForm({ ...form, freelancer: e.target.value })}
                    placeholder="0x..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400 transition-colors font-mono"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Build a landing page for my startup"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400 transition-colors"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the work in detail..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Overall Deadline</label>
                <input
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={
                  !form.title || !form.description || !form.deadline ||
                  (contractMode === 'Direct' && !form.freelancer)
                }
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next — Payment Structure →
              </button>
            </div>
          )}

          {/* Step 2: Payment Structure */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Payment Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { type: 'OneTime', label: 'One Time', desc: 'Single payment on completion', icon: '💰' },
                    { type: 'Milestone', label: 'Milestones', desc: 'Pay per deliverable', icon: '🎯' },
                    { type: 'Recurring', label: 'Recurring', desc: 'Monthly or periodic', icon: '🔄' },
                  ].map((p) => (
                    <button
                      key={p.type}
                      onClick={() => setPaymentType(p.type as PaymentType)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        paymentType === p.type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="text-xl mb-2">{p.icon}</div>
                      <div className="font-medium text-sm text-gray-900">{p.label}</div>
                      <div className="text-xs text-gray-400 mt-1">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {paymentType === 'OneTime' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount (USDC)</label>
                  <input
                    type="number"
                    value={form.totalAmount}
                    onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
              )}

              {paymentType === 'Milestone' && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">Milestones</label>
                  {milestones.map((m, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Milestone {i + 1}</span>
                        {milestones.length > 1 && (
                          <button onClick={() => removeMilestone(i)} className="text-red-400 text-xs hover:text-red-600">Remove</button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={m.description}
                        onChange={(e) => updateMilestone(i, 'description', e.target.value)}
                        placeholder="Milestone description"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-blue-400"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          value={m.amount}
                          onChange={(e) => updateMilestone(i, 'amount', e.target.value)}
                          placeholder="Amount (USDC)"
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-blue-400"
                        />
                        <input
                          type="datetime-local"
                          value={m.deadline}
                          onChange={(e) => updateMilestone(i, 'deadline', e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addMilestone}
                    className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
                  >
                    + Add Milestone
                  </button>
                  <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700 font-medium">
                    Total: {getTotalAmount()} USDC
                  </div>
                </div>
              )}

              {paymentType === 'Recurring' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount per Period (USDC)</label>
                    <input
                      type="number"
                      value={form.recurringAmount}
                      onChange={(e) => setForm({ ...form, recurringAmount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Interval</label>
                    <select
                      value={form.recurringInterval}
                      onChange={(e) => setForm({ ...form, recurringInterval: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400"
                    >
                      <option value="7">Weekly (every 7 days)</option>
                      <option value="14">Bi-weekly (every 14 days)</option>
                      <option value="30">Monthly (every 30 days)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Payments</label>
                    <input
                      type="number"
                      value={form.recurringCount}
                      onChange={(e) => setForm({ ...form, recurringCount: e.target.value })}
                      placeholder="e.g. 3 for 3 months"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400"
                    />
                  </div>
                  {form.recurringAmount && form.recurringCount && (
                    <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700 font-medium">
                      Total locked: {getTotalAmount()} USDC
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  Next — Review →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="font-display font-bold text-gray-900 text-lg">Review & Submit</h3>

              <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-400">Contract Type</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    contractMode === 'Open'
                      ? 'bg-green-50 text-green-700 border border-green-100'
                      : 'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}>
                    {contractMode === 'Open' ? '🌐 Open Job Post' : '🎯 Direct Contract'}
                  </span>
                </div>
                {contractMode === 'Direct' && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-400">Freelancer</span>
                    <span className="font-mono text-xs text-gray-900">{form.freelancer.slice(0, 10)}...{form.freelancer.slice(-6)}</span>
                  </div>
                )}
                {[
                  { label: 'Title', value: form.title },
                  { label: 'Category', value: form.category },
                  { label: 'Payment Type', value: paymentType },
                  { label: 'Total Amount', value: `${getTotalAmount()} USDC` },
                  { label: 'Deadline', value: new Date(form.deadline).toLocaleDateString() },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-400">{item.label}</span>
                    <span className="text-sm font-medium text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>

              {contractMode === 'Open' && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-700">
                  🌐 This job will be visible to all freelancers. They can apply and you choose who to hire.
                </div>
              )}

              {contractMode === 'Direct' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                  🎯 This contract goes directly to the specified freelancer. They must sign to activate it.
                </div>
              )}

              {!isConnected && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
                  Please connect your wallet to submit.
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isPending || isConfirming || !isConnected}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Submitting...' : contractMode === 'Open' ? 'Post Job' : 'Propose Contract'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}