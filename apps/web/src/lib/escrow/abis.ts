/**
 * Hand-authored ABIs for the on-chain escrow contracts.
 *
 * Source : `apps/contracts/src/{MockUSDT,EscrowFactory,TradeEscrow}.sol`.
 * Kept minimal — only the functions and events the frontend actually calls.
 *
 * If you change the Solidity, regenerate these by hand or run :
 *   forge inspect TradeEscrow abi --json
 */

export const MOCK_USDT_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "pure",
  },
] as const;

export const ESCROW_FACTORY_ABI = [
  {
    type: "function",
    name: "create",
    inputs: [
      { name: "buyer", type: "address" },
      { name: "seller", type: "address" },
      { name: "token", type: "address" },
      { name: "amounts", type: "uint128[3]" },
      { name: "deadlines", type: "uint64[3]" },
      { name: "transactionRef", type: "bytes32" },
    ],
    outputs: [{ name: "escrow", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "EscrowCreated",
    inputs: [
      { name: "escrow", type: "address", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "seller", type: "address", indexed: true },
      { name: "totalAmount", type: "uint256", indexed: false },
      { name: "transactionRef", type: "bytes32", indexed: false },
    ],
  },
] as const;

export const TRADE_ESCROW_ABI = [
  {
    type: "function",
    name: "buyer",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "seller",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "arbiter",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalAmount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "funded",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTranches",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[3]",
        components: [
          { name: "amount", type: "uint128" },
          { name: "deadline", type: "uint64" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "fund",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "attestMilestone",
    inputs: [{ name: "trancheIndex", type: "uint8" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claim",
    inputs: [{ name: "trancheIndex", type: "uint8" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "timeoutRefund",
    inputs: [{ name: "trancheIndex", type: "uint8" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Funded",
    inputs: [{ name: "totalAmount", type: "uint256", indexed: false }],
  },
  {
    type: "event",
    name: "MilestoneAttested",
    inputs: [
      { name: "trancheIndex", type: "uint8", indexed: true },
      { name: "by", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "trancheIndex", type: "uint8", indexed: true },
      { name: "seller", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

/** Tranche status enum, mirrored from `TradeEscrow.TrancheStatus`. */
export const TRANCHE_STATUS = ["pending", "attested", "released", "refunded", "disputed"] as const;
export type TrancheStatus = (typeof TRANCHE_STATUS)[number];
