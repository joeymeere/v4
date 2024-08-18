use anchor_lang::prelude::*;

use crate::errors::*;
use crate::state::*;
use crate::utils::*;

use crate::instructions::vault_transaction_create::TransactionMessage;

/// ---- Transaction Multi-Uploading ----
/// This instruction takes an existing vault transaction, and amends it given the index of the existing transaction,
/// additional instructions, and the number of additional ephemeral signers required by the added instructions.
/// It's purpose is to circumvent the size limit of a single transaction, by appending additional instructions to an 
/// existing transaction, ensuring they can still be atomically executed.

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct VaultTransactionMultiUploadArgs {
    /// Index of the vault this transaction belongs to.
    pub vault_index: u8,
    // The transaction index of the transaction to be appended to.
    pub transaction_index: u64,
    /// Number of ephemeral signing PDAs required by the transaction.
    pub ephemeral_signers: u8,
    // Instructions to be appended to the transaction.
    pub additional_instructions: Vec<MultisigCompiledInstruction>,
    pub memo: Option<String>,
}

#[derive(Accounts)]
#[instruction(args: VaultTransactionMultiUploadArgs)]
pub struct VaultTransactionMultiUpload<'info> {
    #[account(
        mut,
        seeds = [SEED_PREFIX, SEED_MULTISIG, multisig.create_key.as_ref()],
        bump = multisig.bump,
    )]
    pub multisig: Account<'info, Multisig>,

    #[account( 
        mut,
        realloc = transaction.try_to_vec()?.len() + args.additional_instructions.try_to_vec()?.len() + 150,
        realloc::payer = rent_payer,
        realloc::zero = false,
        seeds = [
            SEED_PREFIX,
            multisig.key().as_ref(),
            SEED_TRANSACTION,
            &args.transaction_index.to_le_bytes(),
        ],
        bump
    )]
    pub transaction: Account<'info, VaultTransaction>,

    /// The member of the multisig that is adding to the transaction.
    pub creator: Signer<'info>,

    /// The payer for the transaction account rent.
    #[account(mut)]
    pub rent_payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl VaultTransactionMultiUpload<'_> {
    fn validate(&self) -> Result<()> {
        let Self {
            multisig, creator, ..
        } = self;

        // creator
        require!(
            multisig.is_member(creator.key()).is_some(),
            MultisigError::NotAMember
        );
        require!(
            multisig.member_has_permission(creator.key(), Permission::Initiate),
            MultisigError::Unauthorized
        );
        // Don't exceed current max CPI size. 
        require!(
            self.transaction.message.try_to_vec()?.len() < 1280,
            MultisigError::TransactionTooLarge
        );
        /*
        Request for comment on if this check is necessary:
        require!(
            self.transaction.creator.key() == creator.key(),
            MultisigError::Unauthorized
        );
        */

        Ok(())
    }

    /// Create a new vault transaction.
    #[access_control(ctx.accounts.validate())]
    pub fn vault_transaction_multi_upload(
        ctx: Context<Self>,
        args: VaultTransactionMultiUploadArgs,
    ) -> Result<()> {
        let multisig = &mut ctx.accounts.multisig;
        let transaction = &mut ctx.accounts.transaction;
        let _creator = &mut ctx.accounts.creator;

        //let multisig_key = multisig.key();
        let transaction_key = transaction.key();

        /*
        let vault_seeds = &[
            SEED_PREFIX,
            multisig_key.as_ref(),
            SEED_VAULT,
            &args.vault_index.to_le_bytes(),
        ];
        let (_, _vault_bump) = Pubkey::find_program_address(vault_seeds, ctx.program_id);
        */

        let ephemeral_signer_bumps: Vec<u8> = (0..args.ephemeral_signers)
            .map(|ephemeral_signer_index| {
                let ephemeral_signer_seeds = &[
                    SEED_PREFIX,
                    transaction_key.as_ref(),
                    SEED_EPHEMERAL_SIGNER,
                    &ephemeral_signer_index.to_le_bytes(),
                ];

                let (_, bump) =
                    Pubkey::find_program_address(ephemeral_signer_seeds, ctx.program_id);
                bump
            })
            .collect();

        let transaction_index = multisig.transaction_index;

        transaction.ephemeral_signer_bumps.extend(ephemeral_signer_bumps);
        transaction.message.instructions.extend_from_slice(&args.additional_instructions);

        multisig.invariant()?;

        // Logs for indexing.
        msg!("transaction index: {}", transaction_index);

        Ok(())
    }
}