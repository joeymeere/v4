import {
  createVaultTransactionMultiUploadInstruction,
  MultisigCompiledInstruction,
  multisigCompiledInstructionBeet,
  PROGRAM_ID,
} from "../generated";
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
} from "@solana/web3.js";
import { getTransactionPda } from "../pda";
import { BN } from "bn.js";
import { compileToWrappedMessageV0 } from "../utils/compileToWrappedMessageV0";
import { compiledMsInstructionBeet } from "../types";

export function vaultTransactionMultiUpload({
  multisigPda,
  transactionIndex,
  creator,
  rentPayer,
  vaultIndex,
  ephemeralSigners,
  additionalInstructions,
  memo,
  programId = PROGRAM_ID,
}: {
  multisigPda: PublicKey;
  transactionIndex: bigint;
  creator: PublicKey;
  rentPayer?: PublicKey;
  vaultIndex: number;
  /** Number of additional signing PDAs required by the transaction. */
  ephemeralSigners: number;
  /** Message with nstructions to be appended to the transaction. */
  additionalInstructions: TransactionMessage;
  memo?: string;
  programId?: PublicKey;
}) {
  const [transactionPda] = getTransactionPda({
    multisigPda,
    index: transactionIndex,
    programId,
  });

  const compiledMessage = compileToWrappedMessageV0({
    payerKey: additionalInstructions.payerKey,
    recentBlockhash: additionalInstructions.recentBlockhash,
    instructions: additionalInstructions.instructions,
  });

  const serializedIxs = compiledMessage.compiledInstructions.map((ix) => {
    return {
      programIdIndex: ix.programIdIndex,
      accountIndexes: new Uint8Array(ix.accountKeyIndexes),
      data: new Uint8Array(ix.data),
    } as MultisigCompiledInstruction;
  });

  return createVaultTransactionMultiUploadInstruction(
    {
      multisig: multisigPda,
      transaction: transactionPda,
      creator,
      rentPayer: rentPayer ?? creator,
    },
    {
      args: {
        vaultIndex,
        ephemeralSigners,
        transactionIndex: new BN(Number(transactionIndex)),
        additionalInstructions: serializedIxs,
        memo: memo ?? null,
      },
    },
    programId
  );
}
