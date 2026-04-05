'use client'

import { ConnectWallet } from './components/ConnectWallet'
import { useEffect, useRef } from 'react'

export default function Home() {
  const gridRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = gridRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const cols = Math.floor(canvas.width / 60)
    const rows = Math.floor(canvas.height / 60)
    const dots: { x: number; y: number; o: number; speed: number }[] = []

    for (let i = 0; i <= cols; i++) {
      for (let j = 0; j <= rows; j++) {
        dots.push({
          x: i * 60,
          y: j * 60,
          o: Math.random() * 0.3,
          speed: 0.002 + Math.random() * 0.003,
        })
      }
    }

    let frame: number
    let t = 0
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 1
      dots.forEach((d) => {
        d.o = 0.06 + 0.1 * Math.sin(t * d.speed + d.x * 0.01 + d.y * 0.01)
        ctx.beginPath()
        ctx.arc(d.x, d.y, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(37, 99, 235, ${d.o})`
        ctx.fill()
      })
      frame = requestAnimationFrame(animate)
    }
    animate()

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#f8faff] text-gray-900 overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        * { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Syne', sans-serif; }

        .slide-up {
          animation: slideUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards;
          opacity: 0;
        }
        .slide-up:nth-child(1) { animation-delay: 0.1s; }
        .slide-up:nth-child(2) { animation-delay: 0.2s; }
        .slide-up:nth-child(3) { animation-delay: 0.3s; }
        .slide-up:nth-child(4) { animation-delay: 0.4s; }
        .slide-up:nth-child(5) { animation-delay: 0.5s; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .fade-in { animation: fadeIn 0.8s ease forwards; opacity: 0; }
        @keyframes fadeIn { to { opacity: 1; } }

        .tag-pulse {
          animation: tagPulse 2s ease-in-out infinite;
        }
        @keyframes tagPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.2); }
          50% { box-shadow: 0 0 0 6px rgba(37,99,235,0); }
        }

        .btn-primary {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(37,99,235,0.35);
        }

        .card-hover {
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(37,99,235,0.1);
          border-color: rgba(37,99,235,0.25);
        }

        .stat-shimmer {
          position: relative;
          overflow: hidden;
        }
        .stat-shimmer::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(37,99,235,0.05), transparent);
          animation: shimmer 3s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>

      {/* Animated dot grid */}
      <canvas
        ref={gridRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* Soft radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(37,99,235,0.07), transparent)',
          zIndex: 0,
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-blue-100 bg-white/70 backdrop-blur-md px-6 py-4 fade-in">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
              <span className="text-xs font-display font-bold text-white">W</span>
            </div>
            <div>
              <span className="font-display font-bold text-gray-900 tracking-tight">WorkChain</span>
              <span className="ml-2 text-[10px] text-blue-500/70 font-mono uppercase tracking-widest">Base</span>
            </div>
          </div>
          <ConnectWallet />
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="slide-up">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-600 text-xs font-mono px-4 py-2 rounded-full mb-8 tag-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Live on Base Sepolia · Escrow Contract Deployed
          </div>
        </div>

        <h1 className="font-display text-6xl md:text-7xl font-extrabold leading-none tracking-tight mb-6 slide-up">
          <span className="block text-gray-900">Get paid.</span>
          <span className="block text-gray-900">Build trust.</span>
          <span className="block text-blue-600">No middleman.</span>
        </h1>

        <p className="text-gray-500 text-lg max-w-lg mx-auto mb-10 leading-relaxed slide-up">
          Trustless gig platform where payments live in escrow, reputation is
          onchain, and disputes are settled by AI — not humans.
        </p>

        <div className="flex gap-4 justify-center slide-up">
          <button className="btn-primary px-8 py-3.5 text-white font-medium rounded-xl text-sm shadow-md">
            Post a Job
          </button>
          <button className="px-8 py-3.5 text-gray-600 font-medium rounded-xl text-sm border border-gray-200 hover:border-blue-300 hover:text-blue-600 bg-white transition-all shadow-sm">
            Find Work
          </button>
        </div>

        {/* Stats bar */}
        <div className="mt-16 grid grid-cols-3 gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 shadow-sm slide-up">
          {[
            { label: 'Escrow Contract', value: 'Live', sub: 'Base Sepolia' },
            { label: 'Gas Fees', value: '$0.00', sub: 'Paymaster sponsored' },
            { label: 'Settlement', value: 'AI-powered', sub: 'No arbitrator' },
          ].map((s, i) => (
            <div key={i} className="bg-white px-6 py-5 stat-shimmer">
              <div className="font-display font-bold text-gray-900 text-xl">{s.value}</div>
              <div className="text-gray-400 text-xs mt-1">{s.label}</div>
              <div className="text-blue-500 text-[10px] font-mono mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Bottom tag */}
        <div className="mt-12 text-center">
          <span className="text-gray-300 text-xs font-mono tracking-widest uppercase">
            Built on Base · Powered by USDC · AI-resolved disputes
          </span>
        </div>
      </section>
    </main>
  )
}