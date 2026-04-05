export const WORKCHAIN_ESCROW_ADDRESS = '0x4dF5F973bcA6B3067644CAda72A49253c8b5B577' as const

export const WORKCHAIN_ESCROW_ABI = [
  {
    type: 'function',
    name: 'createJob',
    inputs: [
      { name: '_amount', type: 'uint256' },
      { name: '_title', type: 'string' },
      { name: '_description', type: 'string' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'acceptJob',
    inputs: [{ name: '_jobId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'releasePayment',
    inputs: [{ name: '_jobId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'raiseDispute',
    inputs: [{ name: '_jobId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'resolveDispute',
    inputs: [
      { name: '_jobId', type: 'uint256' },
      { name: '_winner', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'cancelJob',
    inputs: [{ name: '_jobId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getJob',
    inputs: [{ name: '_jobId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'client', type: 'address' },
          { name: 'freelancer', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'title', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'completedAt', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'jobCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'JobCreated',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'client', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'title', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'JobAccepted',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'freelancer', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'JobCompleted',
    inputs: [{ name: 'jobId', type: 'uint256', indexed: true }],
  },
  {
    type: 'event',
    name: 'JobDisputed',
    inputs: [{ name: 'jobId', type: 'uint256', indexed: true }],
  },
  {
    type: 'event',
    name: 'JobResolved',
    inputs: [
      { name: 'jobId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'JobCancelled',
    inputs: [{ name: 'jobId', type: 'uint256', indexed: true }],
  },
] as const