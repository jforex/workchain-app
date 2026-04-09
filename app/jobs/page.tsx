'use client'

import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
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
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [coverNote, setCoverNote] = useState('')
  const [proposedRate, setProposedRate] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: contract } = useReadContract({
    address: WORKCHAIN_ESCROW_ADDRESS,
    abi: WORKCHAIN_ESCROW_ABI,
    functionName: 'getContract',
    args: [BigInt(contractId)],
  })

  const { data: appCount } = useReadContract({
    address: WORKCHAIN_ESCROW_ADDRESS,
    abi: WORKCHAIN_ESCROW_ABI,
    functionName: 'getApplicationCount',
    args: [BigInt(contractId)],
  })

  const { data: applications } = useReadContract({
    address: WORKCHAIN_ESCROW_ADDRESS,
    abi: WORKCHAIN_ESCROW_ABI,
    functionName: 'getApplications',
    args: [BigInt(contractId)],
  })

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  if (!contract) return null
  if (contract.status !== 0) return null

  const amount = Number(contract.totalAmount) / 1e6
  const deadline = new Date(Number(contract.deadline) * 1000).toLocaleDateString()
  const isOpen = contract.contractType === 1
  const isDirectFreelancer = !isOpen && address?.toLowerCase() === contract.freelancer.toLowerCase()
  const isClient = address?.toLowerCase() === contract.client.toLowerCase()
  const hasApplied = applications?.some(
    (app) => app.freelancer.toLowerCase() === address?.toLowerCase()
  ) ?? false

  const handleAccept = () => {
    writeContract({
      address: WORKCHAIN_ESCROW_ADDRESS,
      abi: WORKCHAIN_ESCROW_ABI,
      functionName: 'signAndActivate',
      args: [BigInt(contractId)],
    })
  }

  const handleApply = async () => {
    if (!coverNote) return
    setUploading(true)

    let finalCoverNote = coverNote

    if (resumeFile) {
      try {
        const fileExt = resumeFile.name.split('.').pop()
        const fileName = `${address}-${contractId}-${Date.now()}.${fileExt}`

        const { data, error } = await supabase.storage
          .from('resumes')
          .upload(fileName, resumeFile, { upsert: true })

        if (error) throw error

        const { data: urlData } = supabase.storage
          .from('resumes')
          .getPublicUrl(fileName)

        finalCoverNote = `${coverNote}\n\n📎 Resume: ${urlData.publicUrl}`
      } catch (err) {
        console.error('Upload error:', err)
        finalCoverNote = `${coverNote}\n\n📎 Resume: ${resumeFile.name} (upload failed)`
      }
    }

    writeContract({
      address: WORKCHAIN_ESCROW_ADDRESS,
      abi: WORKCHAIN_ESCROW_ABI,
      functionName: 'applyForJob',
      args: [
        BigInt(contractId),
        finalCoverNote,
        proposedRate ? parseUnits(proposedRate, 6) : BigInt(0),
      ],
    })

    setUploading(false)
  }
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[contract.status]}`}>
                {STATUS_LABELS[contract.status]}
              </span>
              <span className="text-xs px-2 py-1 rounded-full border border-blue-100 bg-blue-50 text-blue-600 font-medium">
                {PAYMENT_LABELS[contract.paymentType]}
              </span>
              {isOpen ? (
                <span className="text-xs px-2 py-1 rounded-full border border-green-100 bg-green-50 text-green-600 font-medium">
                  🌐 Open
                </span>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full border border-purple-100 bg-purple-50 text-purple-600 font-medium">
                  🎯 Direct
                </span>
              )}
              {contract.category && (
                <span className="text-xs px-2 py-1 rounded-full border border-gray-100 bg-gray-50 text-gray-500 font-medium">
                  {contract.category}
                </span>
              )}
              {hasApplied && (
                <span className="text-xs px-2 py-1 rounded-full border border-blue-100 bg-blue-50 text-blue-600 font-medium">
                  ✓ Applied
                </span>
              )}
            </div>
            <Link href={`/contract/${contractId}`}>
              <h3 className="font-display font-bold text-gray-900 text-lg leading-tight hover:text-blue-600 transition-colors cursor-pointer">
                {contract.title}
              </h3>
            </Link>
          </div>
          <div className="text-right ml-4 shrink-0">
            <div className="font-display font-bold text-blue-600 text-xl">{amount.toFixed(2)}</div>
            <div className="text-xs text-gray-400">USDC</div>
          </div>
        </div>

        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{contract.description}</p>

        <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span>📅</span>
              <span>Due {deadline}</span>
            </div>
            {isOpen && appCount !== undefined && (
              <div className="flex items-center gap-1">
                <span>👥</span>
                <span>{Number(appCount)} applicant{Number(appCount) !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 font-mono">
            <span>👤</span>
            <span>{contract.client.slice(0, 6)}...{contract.client.slice(-4)}</span>
          </div>
        </div>

        {/* Action area */}
        {isSuccess ? (
          <div className="bg-green-50 text-green-700 text-sm text-center py-2.5 rounded-xl font-medium border border-green-100">
            ✅ {isOpen ? 'Application submitted!' : 'Contract accepted! Funds locked in escrow.'}
          </div>
        ) : isClient ? (
          <div className="bg-gray-50 text-gray-400 text-xs text-center py-2.5 rounded-xl border border-gray-100">
            Your posting
          </div>
        ) : isDirectFreelancer ? (
          <button
            onClick={handleAccept}
            disabled={isPending || isConfirming}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Activating...' : 'Accept Contract'}
          </button>
        ) : isOpen && address ? (
          hasApplied ? (
            <div className="bg-blue-50 text-blue-700 text-xs text-center py-2.5 rounded-xl border border-blue-100 font-medium">
              ✓ You already applied for this job
            </div>
          ) : (
            <button
              onClick={() => setShowApplyForm(!showApplyForm)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {showApplyForm ? 'Cancel' : 'Apply for this Job'}
            </button>
          )
        ) : !address ? (
          <div className="text-xs text-gray-400 text-center py-2">
            Connect wallet to apply
          </div>
        ) : null}
      </div>

      {/* Apply form */}
      {showApplyForm && !isSuccess && !hasApplied && (
        <div className="border-t border-gray-100 p-6 bg-gray-50 space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Your Application</h4>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cover Note</label>
            <textarea
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              placeholder="Why are you the right person for this job?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400 resize-none bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Your Rate (USDC) — optional</label>
            <input
              type="number"
              value={proposedRate}
              onChange={(e) => setProposedRate(e.target.value)}
              placeholder={`${amount.toFixed(2)} (posted rate)`}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Resume / Portfolio — optional</label>
            <div
              onClick={() => document.getElementById(`resume-${contractId}`)?.click()}
              className={`w-full px-3 py-3 border-2 border-dashed rounded-xl text-sm text-center cursor-pointer transition-colors ${
                resumeFile
                  ? 'border-blue-300 bg-blue-50 text-blue-600'
                  : 'border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500'
              }`}
            >
              {resumeFile ? (
                <span>📎 {resumeFile.name} ({(resumeFile.size / 1024).toFixed(0)}KB)</span>
              ) : (
                <span>Click to upload resume or portfolio (PDF, DOC)</span>
              )}
            </div>
            <input
              id={`resume-${contractId}`}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            {resumeFile && (
              <button
                onClick={() => setResumeFile(null)}
                className="text-xs text-red-400 hover:text-red-600 mt-1"
              >
                Remove file
              </button>
            )}
          </div>
          <button
            onClick={handleApply}
            disabled={!coverNote || isPending || isConfirming || uploading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Submitting...' : uploading ? 'Uploading...' : 'Submit Application'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function JobsPage() {
  const { address } = useAccount()
  const [filter, setFilter] = useState<'all' | 'open' | 'mine'>('all')
  const [categoryFilter, setCategoryFilter] = useState('All')

  const CATEGORIES = ['All', 'Web Dev', 'Design', 'Writing', 'Video', 'Marketing', 'AI', 'Mobile', 'Other']

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
        textarea, input {
          color: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
        }
        textarea::placeholder, input::placeholder {
          color: #9ca3af !important;
          -webkit-text-fill-color: #9ca3af !important;
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
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Dashboard
            </Link>
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
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">Job Board</h1>
          <p className="text-gray-400">Browse open contracts — payments locked in escrow.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl p-1">
            {[
              { key: 'all', label: 'All Jobs' },
              { key: 'open', label: '🌐 Open' },
              { key: 'mine', label: '🎯 Assigned to Me' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as typeof filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.key ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
                }`}
              >
                {cat}
              </button>
            ))}
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