'use client'

import { ConnectWallet } from './components/ConnectWallet'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const categories = ['Web Dev', 'Design', 'Writing', 'Video', 'Marketing', 'AI', 'Mobile']

export default function Home() {
  const [tab, setTab] = useState<'hire' | 'work'>('hire')
  const [search, setSearch] = useState('')

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Syne', sans-serif; }

        .slide-up {
          animation: slideUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards;
          opacity: 0;
        }
        .slide-up:nth-child(1) { animation-delay: 0.1s; }
        .slide-up:nth-child(2) { animation-delay: 0.25s; }
        .slide-up:nth-child(3) { animation-delay: 0.4s; }
        .slide-up:nth-child(4) { animation-delay: 0.55s; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .card-hover {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.08);
        }

        .search-bar:focus-within {
          box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
        }

        .category-tag {
          transition: all 0.2s ease;
        }
        .category-tag:hover {
          background: rgba(255,255,255,0.25);
          border-color: rgba(255,255,255,0.6);
        }

        .tab-active {
          background: white;
          color: #1e40af;
          font-weight: 600;
        }
        .tab-inactive {
          color: rgba(255,255,255,0.85);
        }
        .tab-inactive:hover {
          background: rgba(255,255,255,0.1);
        }
      `}</style>

      {/* Navbar */}
      <header className="absolute top-0 left-0 right-0 z-20 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-md">
              <span className="text-xs font-display font-bold text-blue-600">W</span>
            </div>
            <div>
              <span className="font-display font-bold text-white tracking-tight">WorkChain</span>
              <span className="ml-2 text-[10px] text-white/60 font-mono uppercase tracking-widest">Base</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-white/80 text-sm hover:text-white transition-colors">Dashboard</Link>
            <Link href="/jobs" className="text-white/80 text-sm hover:text-white transition-colors">Find Work</Link>
            <button className="text-white/80 text-sm hover:text-white transition-colors">Find Talent</button>
            <button className="text-white/80 text-sm hover:text-white transition-colors">How it Works</button>
            <ConnectWallet />
          </div>
        </div>
      </header>

      {/* Hero with video background */}
      <section className="relative h-screen min-h-[600px] flex items-center">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 w-full">
          <div className="max-w-2xl">

            <div className="slide-up">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-mono px-4 py-2 rounded-full mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live on Base · Escrow Contract Deployed
              </div>
            </div>

            <h1 className="font-display text-5xl md:text-6xl font-extrabold leading-tight text-white mb-4 slide-up">
              Hire the talent<br />
              your work demands.<br />
              <span className="text-blue-400">Get paid. Always.</span>
            </h1>

            <p className="text-white/70 text-lg mb-8 slide-up">
              Trustless escrow. Onchain reputation. AI dispute resolution.<br />
              The gig platform built for a world without broken promises.
            </p>

            <div className="slide-up">
              <div className="inline-flex bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1 mb-4">
                <button
                  onClick={() => setTab('hire')}
                  className={`px-6 py-2 rounded-lg text-sm transition-all ${tab === 'hire' ? 'tab-active' : 'tab-inactive'}`}
                >
                  I want to hire
                </button>
                <button
                  onClick={() => setTab('work')}
                  className={`px-6 py-2 rounded-lg text-sm transition-all ${tab === 'work' ? 'tab-active' : 'tab-inactive'}`}
                >
                  I want to work
                </button>
              </div>

              <div className="search-bar flex items-center bg-white rounded-2xl overflow-hidden shadow-2xl mb-4 transition-all">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tab === 'hire' ? 'Describe what you need done...' : 'Search for jobs...'}
                  className="flex-1 px-6 py-4 text-gray-800 text-sm outline-none placeholder-gray-400"
                />
                {tab === 'hire' ? (
                  <Link href="/post-contract" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-sm font-medium transition-colors">
                    Post Job
                  </Link>
                ) : (
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-sm font-medium transition-colors">
                    Search
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className="category-tag px-4 py-1.5 bg-white/10 backdrop-blur-sm border border-white/25 text-white text-xs rounded-full transition-all"
                  >
                    {cat} →
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-gray-100 py-6">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { value: 'Zero Fees', label: 'Gas sponsored by Paymaster' },
              { value: 'USDC', label: 'Stable payments, always' },
              { value: 'AI-Resolved', label: 'Disputes settled onchain' },
            ].map((s, i) => (
              <div key={i}>
                <div className="font-display font-bold text-gray-900 text-xl">{s.value}</div>
                <div className="text-gray-400 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl font-bold text-gray-900 mb-4">
            Why WorkChain?
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Built different. Every payment, reputation, and dispute lives onchain — transparent, permanent, and tamper-proof.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '⬡',
              title: 'Escrow Protection',
              desc: 'Payment locks in a USDC smart contract the moment a job is posted. Funds release only when work is approved — or refunded if cancelled.',
              color: 'text-blue-500',
              bg: 'bg-blue-50',
              border: 'border-blue-100',
            },
            {
              icon: '◈',
              title: 'Onchain Reputation',
              desc: 'Every completed job mints a credential NFT. A permanent, verifiable work history that belongs to the freelancer — unfakeable, untakeable.',
              color: 'text-violet-500',
              bg: 'bg-violet-50',
              border: 'border-violet-100',
            },
            {
              icon: '⬟',
              title: 'AI Dispute Resolution',
              desc: 'Disputes go to an AI resolver that reads both sides and executes a verdict onchain. No arbitrator, no human bias, no weeks of waiting.',
              color: 'text-emerald-500',
              bg: 'bg-emerald-50',
              border: 'border-emerald-100',
            },
          ].map((f, i) => (
            <div
              key={i}
              className={`bg-white border ${f.border} rounded-2xl p-6 card-hover shadow-sm`}
            >
              <div className={`text-2xl mb-4 font-mono ${f.color} ${f.bg} w-10 h-10 rounded-lg flex items-center justify-center`}>
                {f.icon}
              </div>
              <h3 className="font-display font-bold text-gray-900 text-lg mb-3">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">W</span>
            </div>
            <span className="font-display font-bold text-gray-900 text-sm">WorkChain</span>
          </div>
          <span className="text-gray-300 text-xs font-mono tracking-widest uppercase">
            Built on Base · Powered by USDC
          </span>
        </div>
      </footer>
    </main>
  )
}