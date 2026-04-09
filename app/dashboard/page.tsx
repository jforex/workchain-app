'use client'

import { useAccount, useReadContract } from 'wagmi'
import { WORKCHAIN_ESCROW_ADDRESS, WORKCHAIN_ESCROW_ABI, WORKCHAIN_REPUTATION_ADDRESS, WORKCHAIN_REPUTATION_ABI } from '@/config/contracts'
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

function ContractRow({ contractId, address }: { contractId: number, address: string }) {
  const { data: contract } = useReadContract({
    address: WORKCHAIN_ESCROW_ADDRESS,
    abi: WORKCHAIN_ESCROW_ABI,
    functionName: 'getContract',
    args: [BigInt(contractId)],
  })

  if (!contract) return null

  const isClient = address.toLowerCase() === contract.client.toLowerCase()
  const isFreelancer = address.toLowerCase() === contract.freelancer.toLowerCase()

  if (!isClient && !isFreelancer) return null

  const amount = Number(contract.totalAmount) / 1e6
  const deadline = new Date(Number(contract.deadline) * 1000).toLocaleDateString()

  return (
    <Link href={`/contract/${contractId}`}>
      <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
            isClient ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
          }`}>
            {isClient ? '👔' : '💼'}
          </div>
          <div>
            <div className="font-medium text-gray-900 text-sm">{contract.title}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[contract.status]}`}>
                {STATUS_LABELS[contract.status]}
              </span>
              <span className="text-xs text-gray-400">
                {isClient ? 'You are the client' : 'You are the freelancer'}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className="font-bold text-blue-600 text-sm">{amount.toFixed(2)} USDC</div>
          <div className="text-xs text-gray-400 mt-1">Due {deadline}</div>
        </div>
      </div>
    </Link>
  )
}

function CredentialCard({ tokenId }: { tokenId: number }) {
  const { data: credential } = useReadContract({
    address: WORKCHAIN_REPUTATION_ADDRESS,
    abi: WORKCHAIN_REPUTATION_ABI,
    functionName: 'getCredential',
    args: [BigInt(tokenId)],
  })

  if (!credential) return null

  const amount = Number(credential.amount) / 1e6
  const completedAt = new Date(Number(credential.completedAt) * 1000).toLocaleDateString()

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-xl">⭐</div>
        <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-1 rounded-full font-medium">Verified</span>
      </div>
      <h4 className="font-display font-bold text-gray-900 text-sm mb-1">{credential.jobTitle}</h4>
      <div className="text-xs text-gray-400 mb-3">{credential.category}</div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-blue-600">{amount.toFixed(2)} USDC</span>
        <span className="text-gray-400">{completedAt}</span>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400 font-mono">
        From: {credential.client.slice(0, 8)}...{credential.client.slice(-4)}
      </div>
    </div>
  )
}

function StatsCard({ label, value, icon, color }: { label: string, value: number, icon: string, color: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <div className="text-2xl mb-3">{icon}</div>
      <div className={`font-display font-bold text-2xl ${color}`}>{value}</div>
      <div className="text-gray-400 text-sm mt-1">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const { address, isConnected } = useAccount()

  const { data: contractCount } = useReadContract({
    address: WORKCHAIN_ESCROW_ADDRESS,
    abi: WORKCHAIN_ESCROW_ABI,
    functionName: 'contractCount',
  })

  const { data: credentialIds } = useReadContract({
    address: WORKCHAIN_REPUTATION_ADDRESS,
    abi: WORKCHAIN_REPUTATION_ABI,
    functionName: 'getFreelancerCredentials',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const credCount = credentialIds?.length ?? 0
  const count = contractCount ? Number(contractCount) : 0
  const contractIds = Array.from({ length: count }, (_, i) => i + 1)

  return (
    <main className="min-h-screen bg-[#f8faff]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Syne', sans-serif; }
      `}</style>

      <header className="border-b border-gray-100 bg-white px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">W</span>
            </div>
            <span className="font-display font-bold text-gray-900">WorkChain</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/jobs" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Job Board</Link>
            <Link href="/post-contract" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
              Post a Job
            </Link>
            <ConnectWallet />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {!isConnected ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Connect your wallet</h2>
            <p className="text-gray-400 text-sm mb-6">Connect your wallet to view your dashboard</p>
            <ConnectWallet />
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-8 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {address?.slice(2, 4).toUpperCase()}
                </div>
                <div>
                  <div className="font-display font-bold text-gray-900 text-lg">My Dashboard</div>
                  <div className="font-mono text-sm text-gray-400 mt-1">{address}</div>
                  <Link href={`/profile/${address}`} className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1 inline-block">
                    View my public profile
                  </Link>
                </div>
                <div className="ml-auto">
                  <div className="text-xs bg-green-50 text-green-700 border border-green-100 px-3 py-1.5 rounded-full font-medium">
                    Base Sepolia
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatsCard label="Total Contracts" value={count} icon="📋" color="text-gray-900" />
              <StatsCard label="Builder Code" value={0} icon="🏗️" color="text-blue-600" />
              <StatsCard label="USDC Earned" value={0} icon="💰" color="text-green-600" />
              <StatsCard label="Reputation NFTs" value={credCount} icon="⭐" color="text-yellow-500" />
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-gray-900 text-xl">My Contracts</h2>
                <Link href="/jobs" className="text-sm text-blue-600 hover:text-blue-700 transition-colors">Browse Jobs</Link>
              </div>
              {count === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl">
                  <div className="text-4xl mb-3">📭</div>
                  <h3 className="font-display font-bold text-gray-900 mb-2">No contracts yet</h3>
                  <p className="text-gray-400 text-sm mb-4">Post a job or apply for one to get started</p>
                  <div className="flex gap-3 justify-center">
                    <Link href="/post-contract" className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
                      Post a Job
                    </Link>
                    <Link href="/jobs" className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                      Find Work
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {contractIds.map((id) => (
                    address && <ContractRow key={id} contractId={id} address={address} />
                  ))}
                </div>
              )}
            </div>

            {credCount > 0 && (
              <div className="mb-8">
                <h2 className="font-display font-bold text-gray-900 text-xl mb-4">My Reputation Credentials</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {credentialIds?.map((tokenId) => (
                    <CredentialCard key={tokenId.toString()} tokenId={Number(tokenId)} />
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-blue-200 text-xs font-mono uppercase tracking-widest mb-2">Builder Code</div>
                  <div className="font-display font-bold text-2xl mb-1">bc_v1ampve4</div>
                  <div className="text-blue-200 text-sm">Every transaction through WorkChain attributes to your builder code on Base.</div>
                </div>
                <div className="text-4xl">🏗️</div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-500 flex items-center justify-between">
                <span className="text-blue-200 text-xs">Registered on Base.dev</span>
                <Link href="https://www.base.dev/apps/69d26f3e24f9e4259fec4618" target="_blank" className="text-white text-xs font-medium hover:text-blue-200 transition-colors">
                  View Dashboard
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}