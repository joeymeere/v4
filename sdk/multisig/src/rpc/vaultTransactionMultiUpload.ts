import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  SendOptions,
  Signer,
  TransactionInstruction,
  TransactionMessage,
  TransactionSignature,
} from "@solana/web3.js";
import * as transactions from "../transactions";
import { translateAndThrowAnchorError } from "../errors";
import { MultisigCompiledInstruction } from "../generated";

/** Upload instructions to a vault transaction. */
export async function vaultTransactionMultiUpload({
  connection,
  feePayer,
  multisigPda,
  transactionIndex,
  creator,
  rentPayer,
  vaultIndex,
  ephemeralSigners,
  additionalInstructions,
  memo,
  signers,
  sendOptions,
  programId,
}: {
  connection: Connection;
  feePayer: Signer;
  multisigPda: PublicKey;
  transactionIndex: bigint;
  /** Member of the multisig that is creating the transaction. */
  creator: PublicKey;
  /** Payer for the transaction account rent. If not provided, `creator` is used. */
  rentPayer?: PublicKey;
  vaultIndex: number;
  /** Number of ephemeral signing PDAs required by the transaction. */
  ephemeralSigners: number;
  /** Instructions to be appended to the transaction. */
  additionalInstructions: TransactionMessage;
  memo?: string;
  signers?: Signer[];
  sendOptions?: SendOptions;
  programId?: PublicKey;
}): Promise<TransactionSignature> {
  const blockhash = (await connection.getLatestBlockhash()).blockhash;

  const tx = transactions.vaultTransactionMultiUpload({
    blockhash,
    feePayer: feePayer.publicKey,
    multisigPda,
    transactionIndex,
    creator,
    rentPayer,
    vaultIndex,
    ephemeralSigners,
    additionalInstructions,
    memo,
    programId,
  });

  tx.sign([feePayer, ...(signers ?? [])]);

  try {
    return await connection.sendTransaction(tx, sendOptions);
  } catch (err) {
    translateAndThrowAnchorError(err);
  }
}
