import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import * as instructions from "../instructions/index";
import { MultisigCompiledInstruction } from "../generated";

/**
 * Returns unsigned `VersionedTransaction` that needs to be
 * signed by `creator`, `rentPayer` and `feePayer` before sending it.
 */
export function vaultTransactionMultiUpload({
  blockhash,
  feePayer,
  multisigPda,
  transactionIndex,
  creator,
  rentPayer,
  vaultIndex,
  ephemeralSigners,
  additionalInstructions,
  memo,
  programId,
}: {
  blockhash: string;
  feePayer: PublicKey;
  multisigPda: PublicKey;
  transactionIndex: bigint;
  /** Member of the multisig that is creating the transaction. */
  creator: PublicKey;
  /** Payer for the transaction account rent. If not provided, `creator` is used. */
  rentPayer?: PublicKey;
  vaultIndex: number;
  /** Number of additional signing PDAs required by the transaction. */
  ephemeralSigners: number;
  /** Instructions to be appended to the transaction. */
  additionalInstructions: TransactionMessage;
  memo?: string;
  programId?: PublicKey;
}): VersionedTransaction {
  const message = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions: [
      instructions.vaultTransactionMultiUpload({
        multisigPda,
        transactionIndex,
        creator,
        rentPayer,
        vaultIndex,
        ephemeralSigners,
        additionalInstructions,
        memo,
        programId,
      }),
    ],
  }).compileToV0Message();

  return new VersionedTransaction(message);
}
