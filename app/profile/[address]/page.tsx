'use client'

import { useParams } from 'next/navigation'
import { useAccount, useReadContract } from 'wagmi'
import { WORKCHAIN_ESCROW_ADDRESS, WORKCHAIN_ESCROW_ABI, WORKCHAIN_REPUTATION_ADDRESS, WORKCHAIN_REPUTATION_ABI } from '@/config/contracts'
import { ConnectWallet } from '../../components/ConnectWallet'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useState, useEffect } from 'react'

interface Profile {
  address: string
  name: string
  bio: string
  skills: string[]
  portfolio: string
  twitter: string
  github: string
  available: boolean
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

export default function ProfilePage() {
  const { address: profileAddress } = useParams()
  const { address: connectedAddress } = useAccount()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    bio: '',
    skills: '',
    portfolio: '',
    twitter: '',
    github: '',
    available: true,
  })

  const isOwner = connectedAddress?.toLowerCase() === (profileAddress as string)?.toLowerCase()

  const { data: contractCount } = useReadContract({
    address: WORKCHAIN_ESCROW_ADDRESS,
    abi: WORKCHAIN_ESCROW_ABI,
    functionName: 'contractCount',
  })

  const { data: credentialIds } = useReadContract({
    address: WORKCHAIN_REPUTATION_ADDRESS,
    abi: WORKCHAIN_REPUTATION_ABI,
    functionName: 'getFreelancerCredentials',
    args: [profileAddress as `0x${string}`],
  })

  const credCount = credentialIds?.length ?? 0
  const totalContracts = contractCount ? Number(contractCount) : 0

  useEffect(() => {
    loadProfile()
  }, [profileAddress])

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('address', (profileAddress as string).toLowerCase())
        .single()

      if (data) {
        setProfile(data)
        setForm({
          name: data.name || '',
          bio: data.bio || '',
          skills: data.skills?.join(', ') || '',
          portfolio: data.portfolio || '',
          twitter: data.twitter || '',
          github: data.github || '',
          available: data.available ?? true,
        })
      }
    } catch {
      // No profile yet
    }
  }

  const saveProfile = async () => {
    if (!connectedAddress) return
    setSaving(true)

    try {
      const profileData = {
        address: connectedAddress.toLowerCase(),
        name: form.name,
        bio: form.bio,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        portfolio: form.portfolio,
        twitter: form.twitter,
        github: form.github,
        available: form.available,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'address' })

      if (error) throw error

      await loadProfile()
      setEditing(false)
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const addr = profileAddress as string

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
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">W</span>
            </div>
            <span className="font-display font-bold text-gray-900">WorkChain</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/jobs" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Job Board</Link>
            <ConnectWallet />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Profile header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                {addr.slice(2, 4).toUpperCase()}
              </div>
              <div>
                <h1 className="font-display font-bold text-gray-900 text-2xl mb-1">
                  {profile?.name || `${addr.slice(0, 6)}...${addr.slice(-4)}`}
                </h1>
                <div className="font-mono text-xs text-gray-400">{addr}</div>
                {profile?.available && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Available for work
                  </div>
                )}
              </div>
            </div>
            {isOwner && (
              <button
                onClick={() => setEditing(!editing)}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                {editing ? 'Cancel' : 'Edit Profile'}
              </button>
            )}
          </div>

          {!editing && profile?.bio && (
            <p className="mt-5 text-gray-500 text-sm leading-relaxed">{profile.bio}</p>
          )}

          {!editing && profile?.skills && profile.skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span key={skill} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-medium">
                  {skill}
                </span>
              ))}
            </div>
          )}

          {!editing && (profile?.portfolio || profile?.twitter || profile?.github) && (
            <div className="mt-4 flex items-center gap-4">
              {profile.portfolio && (
                <a href={profile.portfolio} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  🌐 Portfolio
                </a>
              )}
              {profile.twitter && (
                <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  𝕏 @{profile.twitter}
                </a>
              )}
              {profile.github && (
                <a href={`https://github.com/${profile.github}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  GitHub: {profile.github}
                </a>
              )}
            </div>
          )}

          {/* Edit form */}
          {editing && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Display Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name or handle"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Tell clients about yourself..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Skills (comma separated)</label>
                <input
                  type="text"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  placeholder="React, Solidity, UI Design, Python..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Portfolio URL</label>
                  <input
                    type="text"
                    value={form.portfolio}
                    onChange={(e) => setForm({ ...form, portfolio: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Twitter handle</label>
                  <input
                    type="text"
                    value={form.twitter}
                    onChange={(e) => setForm({ ...form, twitter: e.target.value })}
                    placeholder="username"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">GitHub handle</label>
                  <input
                    type="text"
                    value={form.github}
                    onChange={(e) => setForm({ ...form, github: e.target.value })}
                    placeholder="username"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="available"
                  checked={form.available}
                  onChange={(e) => setForm({ ...form, available: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="available" className="text-sm text-gray-600">Available for work</label>
              </div>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Reputation NFTs', value: credCount, icon: '⭐' },
            { label: 'Total Contracts', value: totalContracts, icon: '📋' },
            { label: 'Member Since', value: '2026', icon: '📅' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="font-display font-bold text-2xl text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Reputation credentials */}
        {credCount > 0 && (
          <div>
            <h2 className="font-display font-bold text-gray-900 text-xl mb-4">Reputation Credentials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {credentialIds?.map((tokenId) => (
                <CredentialCard key={tokenId.toString()} tokenId={Number(tokenId)} />
              ))}
            </div>
          </div>
        )}

        {credCount === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="text-4xl mb-3">🏆</div>
            <h3 className="font-display font-bold text-gray-900 mb-2">No credentials yet</h3>
            <p className="text-gray-400 text-sm">Complete jobs on WorkChain to earn verifiable onchain credentials.</p>
            <Link href="/jobs" className="inline-block mt-4 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
              Browse Jobs
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}