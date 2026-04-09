import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createWalletClient, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { WORKCHAIN_ESCROW_ADDRESS, WORKCHAIN_ESCROW_ABI } from '@/config/contracts'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { contractId, title, description, deliverables, totalAmount, clientEvidence, freelancerEvidence, clientAddress, freelancerAddress } = await req.json()

    // Ask Claude to read the evidence and decide
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `You are a neutral arbitrator for a freelance contract dispute on WorkChain, a decentralized platform.

CONTRACT DETAILS:
- Title: ${title}
- Description: ${description}
- Deliverables agreed upon: ${deliverables || 'Not specified'}
- Total Amount: ${totalAmount} USDC

CLIENT'S CLAIM:
${clientEvidence}

FREELANCER'S CLAIM:
${freelancerEvidence}

Based strictly on the contract terms and deliverables, decide who should receive the funds.

Respond ONLY with valid JSON in this exact format, nothing else:
{
  "winner": "client" or "freelancer",
  "reasoning": "2-3 sentence explanation of your decision"
}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const verdict = JSON.parse(clean)

    const winner = verdict.winner === 'client' ? clientAddress : freelancerAddress

    // Execute onchain using a server-side wallet
    const privateKey = process.env.RESOLVER_PRIVATE_KEY as `0x${string}`
    const account = privateKeyToAccount(privateKey)
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http('https://sepolia.base.org'),
    })

    const amount = parseUnits(totalAmount.toString(), 6)

    const hash = await walletClient.writeContract({
      address: WORKCHAIN_ESCROW_ADDRESS,
      abi: WORKCHAIN_ESCROW_ABI,
      functionName: 'resolveDispute',
      args: [BigInt(contractId), winner as `0x${string}`, amount],
    })

    return NextResponse.json({
      success: true,
      winner: verdict.winner,
      reasoning: verdict.reasoning,
      txHash: hash,
    })

  } catch (error: any) {
    console.error('Dispute resolution error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}