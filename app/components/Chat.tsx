'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { Client, type Signer, IdentifierKind } from '@xmtp/browser-sdk'

interface Message {
  id: string
  senderInboxId: string
  content: string
  sent: Date
}

interface ChatProps {
  peerAddress: string
  contractId: string
  contractTitle: string
}

export function Chat({ peerAddress, contractId, contractTitle }: ChatProps) {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [client, setClient] = useState<Client | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [conversation, setConversation] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const createSigner = (walletClient: any): Signer => ({
    type: 'EOA',
    getIdentifier: () => ({
      identifierKind: IdentifierKind.Ethereum,
      identifier: walletClient.account.address.toLowerCase(),
    }),
    signMessage: async (message: string) => {
      const signature = await walletClient.signMessage({ message })
      return signature
    },
  })

  const initXmtp = async () => {
    if (!walletClient || !address) return
    setInitializing(true)
    setError(null)

    try {
      const signer = createSigner(walletClient)
      const xmtp = await Client.create(signer)
      setClient(xmtp)

      const peerIdentifier = {
        identifierKind: IdentifierKind.Ethereum,
        identifier: peerAddress.toLowerCase(),
      }

      // Check if peer is on XMTP
      const canMessage = await Client.canMessage([peerIdentifier])
      if (!canMessage.get(peerAddress.toLowerCase())) {
        setError('The other party has not enabled XMTP yet.')
        setInitializing(false)
        return
      }

      // Create or find DM conversation
      const conv = await xmtp.conversations.createDmWithIdentifier(peerIdentifier)
      setConversation(conv)

      // Load existing messages
      const msgs = await conv.messages()
      setMessages(msgs.map((m: any) => ({
        id: m.id,
        senderInboxId: m.senderInboxId,
        content: typeof m.content === 'string' ? m.content : '',
        sent: new Date(m.sentAtNs ? Number(m.sentAtNs) / 1_000_000 : Date.now()),
      })))

      // Stream new messages
      ;(async () => {
        const stream = await conv.stream()
        for await (const msg of stream) {
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev
            return [...prev, {
              id: msg.id,
              senderInboxId: msg.senderInboxId,
              content: typeof msg.content === 'string' ? msg.content : '',
              sent: new Date(msg.sentAtNs ? Number(msg.sentAtNs) / 1_000_000 : Date.now()),
            }]
          })
        }
      })()

    } catch (err) {
      console.error('XMTP init error:', err)
      setError('Failed to initialize chat. Please try again.')
    } finally {
      setInitializing(false)
    }
  }

  const sendMessage = async () => {
    if (!conversation || !newMessage.trim()) return
    setLoading(true)
    try {
      await conversation.send(newMessage.trim())
      setNewMessage('')
    } catch (err) {
      console.error('Send error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!address) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
        <p className="text-gray-400 text-sm">Connect your wallet to use chat</p>
      </div>
    )
  }

  if (peerAddress === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
        <div className="text-3xl mb-2">💬</div>
        <p className="text-gray-400 text-sm">Chat will be available once a freelancer is assigned</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
        <div className="text-3xl mb-3">💬</div>
        <h4 className="font-display font-bold text-gray-900 mb-2">Contract Chat</h4>
        <p className="text-gray-400 text-sm mb-4">
          Chat directly with the other party. Powered by XMTP — decentralized, end-to-end encrypted.
        </p>
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600 mb-4">
            {error}
          </div>
        )}
        <button
          onClick={initXmtp}
          disabled={initializing}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {initializing ? 'Initializing...' : 'Enable Chat'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Chat header */}
      <div className="border-b border-gray-100 px-5 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
          💬
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">Contract Chat</div>
          <div className="text-xs text-gray-400 font-mono">
            {peerAddress.slice(0, 8)}...{peerAddress.slice(-6)}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs text-gray-400">XMTP · E2E Encrypted</span>
        </div>
      </div>

      {/* Messages */}
      <div className="h-72 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderInboxId === client.inboxId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                isMe
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-900 rounded-bl-md'
              }`}>
                <p>{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                  {msg.sent.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-4 flex gap-3">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || loading}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}