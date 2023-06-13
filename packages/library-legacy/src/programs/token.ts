// token transfer functionality // 

// duplicate from
//    solana-program-library/token/js/src/actions/
//           +
//    solana-program-library/token/js/src/instructions/

/

/*  -- basic token functions --
Transfer, initialize account, burn, close account
    InitializeAccount = 1,(? use Associated token program!)
    Transfer = 3,
    Burn = 8,
    CloseAccount = 9,
    ----------
extensions?
    approve = 4
    revoke = 5
    setauth = 6

    initMint = 0
    mintto = 7
*/

/** Address of the SPL Token program */
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

//
//    Quick instruction encoder
//    for 
//    sig: uint8 instruction, uint64 amount
//        [Transfer, Burn, Approve, Mintto]
//


function bignumber_Encode(n, dec, i){

  var n2 = BigInt(n)* BigInt(10**dec); /// non-Integer n Err! vs poor precision[rare?]
  //console.log(n2);
  var k = BigInt(256);
  var j=0;
  var res = [];
  res[0] = i;
  j++;
  while(n2>0){
    res[j] =  Number(n2 % k); //Number();
    n2 = (n2 - BigInt(res[j])) / BigInt(256);
    j++;
    }
  while(j<9) res[j++] =0;
  //console.log(res);
  return res;
  }

/*

export async function createAccount(
    connection: Connection,
    payer: Signer,
    mint: PublicKey,
    owner: PublicKey,
    keypair?: Keypair,
    confirmOptions?: ConfirmOptions,
    programId = TOKEN_PROGRAM_ID
): Promise<PublicKey> {
    // If a keypair isn't provided, create the associated token account and return its address 
    if (!keypair) return await createAssociatedTokenAccount(connection, payer, mint, owner, confirmOptions, programId); // ** #2 **

    // Otherwise, create the account with the provided keypair and return its public key         // On-curve token accounts?
    const mintState = await getMint(connection, mint, confirmOptions?.commitment, programId);
    const space = getAccountLenForMint(mintState);
    const lamports = await connection.getMinimumBalanceForRentExemption(space);

    const transaction = new Transaction().add(
        SystemProgram.createAccount({                              // ** #? # ** (System_prog instruction #1?)
            fromPubkey: payer.publicKey,
            newAccountPubkey: keypair.publicKey,
            space,
            lamports,
            programId,
        }),
        createInitializeAccountInstruction(keypair.publicKey, mint, owner, programId)               // **  #3   ** [(token prog Instr $1)]
    );

    await sendAndConfirmTransaction(connection, transaction, [payer, keypair], confirmOptions);

    return keypair.publicKey;
}
--------------------

export async function createAssociatedTokenAccount(   // ** #2 **
    connection: Connection,
    payer: Signer,
    mint: PublicKey,
    owner: PublicKey,
    confirmOptions?: ConfirmOptions,
    programId = TOKEN_PROGRAM_ID,
    associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<PublicKey> {
    const associatedToken = getAssociatedTokenAddressSync(mint, owner, false, programId, associatedTokenProgramId); // ** #4 **  (## publickey.find_addr)

    const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(          // ** #5 **  (Associated_token_program instruction #1?)
            payer.publicKey,
            associatedToken,
            owner,
            mint,
            programId,
            associatedTokenProgramId
        )
    );

    await sendAndConfirmTransaction(connection, transaction, [payer], confirmOptions);

    return associatedToken;
}
--------------------

export function createInitializeAccountInstruction(     // ** #3 ** (token prog Instr $1)
    account: PublicKey,
    mint: PublicKey,
    owner: PublicKey,
    programId = TOKEN_PROGRAM_ID
): TransactionInstruction {
    const keys = [
        { pubkey: account, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];

    const data = Buffer.alloc(initializeAccountInstructionData.span);
    initializeAccountInstructionData.encode({ instruction: TokenInstruction.InitializeAccount }, data);

    return new TransactionInstruction({ keys, programId, data });
}

-------------------

/** TODO: docs 
export const initializeAccountInstructionData = struct<InitializeAccountInstructionData>([u8('instruction')]);

------------------

/** Token account as stored by the program 
export interface RawAccount {
    mint: PublicKey;
    owner: PublicKey;
    amount: bigint;
    delegateOption: 1 | 0;
    delegate: PublicKey;
    state: AccountState;
    isNativeOption: 1 | 0;
    isNative: bigint;
    delegatedAmount: bigint;
    closeAuthorityOption: 1 | 0;
    closeAuthority: PublicKey;
}

/** Buffer layout for de/serializing a token account 
export const AccountLayout = struct<RawAccount>([
    publicKey('mint'),
    publicKey('owner'),
    u64('amount'),
    u32('delegateOption'),
    publicKey('delegate'),
    u8('state'),
    u32('isNativeOption'),
    u64('isNative'),
    u64('delegatedAmount'),
    u32('closeAuthorityOption'),
    publicKey('closeAuthority'),
]);

// 4-byte bools? [u32's]

account size: 32+32+8+4+32+1+4+8+8+4+32
32*4 + 8*3 + 4*3 + 1
-> 32*5 + 4*1 + 1
> 160 +5 
-----------------------------

export async function getAssociatedTokenAddress( // ** #4 **    (## publickey.find_addr)
    mint: PublicKey,
    owner: PublicKey,
    allowOwnerOffCurve = false,
    programId = TOKEN_PROGRAM_ID,
    associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<PublicKey> {
    if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) throw new TokenOwnerOffCurveError();

    const [address] = await PublicKey.findProgramAddress(
        [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
        associatedTokenProgramId
    );

    return address;
}

---------------------------

function buildAssociatedTokenAccountInstruction(     // ** 5 **
    payer: PublicKey,
    associatedToken: PublicKey,
    owner: PublicKey,
    mint: PublicKey,
    instructionData: Buffer,
    programId = TOKEN_PROGRAM_ID,
    associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): TransactionInstruction {
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: associatedToken, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: programId, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
        keys,
        programId: associatedTokenProgramId,
        data: instructionData,
    });
}

//-------------------------

export async function closeAccount(
    connection: Connection,
    payer: Signer,
    account: PublicKey,
    destination: PublicKey,
    authority: Signer | PublicKey,
    multiSigners: Signer[] = [],
    confirmOptions?: ConfirmOptions,
    programId = TOKEN_PROGRAM_ID
): Promise<TransactionSignature> {
    const [authorityPublicKey, signers] = getSigners(authority, multiSigners);

    const transaction = new Transaction().add(
        createCloseAccountInstruction(account, destination, authorityPublicKey, multiSigners, programId)
    );

    return await sendAndConfirmTransaction(connection, transaction, [payer, ...signers], confirmOptions);
}

----------------

export function createCloseAccountInstruction(
    account: PublicKey,
    destination: PublicKey,
    authority: PublicKey,
    multiSigners: (Signer | PublicKey)[] = [],
    programId = TOKEN_PROGRAM_ID
): TransactionInstruction {
    const keys = addSigners(
        [
            { pubkey: account, isSigner: false, isWritable: true },
            { pubkey: destination, isSigner: false, isWritable: true },
        ],
        authority,
        multiSigners
    );

    const data = Buffer.alloc(closeAccountInstructionData.span);
    closeAccountInstructionData.encode({ instruction: TokenInstruction.CloseAccount }, data);

    return new TransactionInstruction({ keys, programId, data });
}


---------------
    
    /** TODO: docs 
export const closeAccountInstructionData = struct<CloseAccountInstructionData>([u8('instruction')]);

//--------------------------

export async function burn(
    connection: Connection,
    payer: Signer,
    account: PublicKey,
    mint: PublicKey,
    owner: Signer | PublicKey,
    amount: number | bigint,
    multiSigners: Signer[] = [],
    confirmOptions?: ConfirmOptions,
    programId = TOKEN_PROGRAM_ID
): Promise<TransactionSignature> {
    const [ownerPublicKey, signers] = getSigners(owner, multiSigners);

    const transaction = new Transaction().add(
        createBurnInstruction(account, mint, ownerPublicKey, amount, multiSigners, programId)
    );

    return await sendAndConfirmTransaction(connection, transaction, [payer, ...signers], confirmOptions);
}

----------------


export function createBurnInstruction(
    account: PublicKey,
    mint: PublicKey,
    owner: PublicKey,
    amount: number | bigint,
    multiSigners: (Signer | PublicKey)[] = [],
    programId = TOKEN_PROGRAM_ID
): TransactionInstruction {
    const keys = addSigners(
        [
            { pubkey: account, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: true },
        ],
        owner,
        multiSigners
    );

    const data = Buffer.alloc(burnInstructionData.span);
    burnInstructionData.encode(
        {
            instruction: TokenInstruction.Burn,
            amount: BigInt(amount),
        },
        data
    );

    return new TransactionInstruction({ keys, programId, data });
}

-------------
    
    /** TODO: docs 
export const burnInstructionData = struct<BurnInstructionData>([u8('instruction'), u64('amount')]);


//----------------------------

export async function transfer(
    connection: Connection,
    payer: Signer,
    source: PublicKey,
    destination: PublicKey,
    owner: Signer | PublicKey,
    amount: number | bigint,
    multiSigners: Signer[] = [],
    confirmOptions?: ConfirmOptions,
    programId = TOKEN_PROGRAM_ID
): Promise<TransactionSignature> {
    const [ownerPublicKey, signers] = getSigners(owner, multiSigners);

    const transaction = new Transaction().add(
        createTransferInstruction(source, destination, ownerPublicKey, amount, multiSigners, programId)
    );

    return await sendAndConfirmTransaction(connection, transaction, [payer, ...signers], confirmOptions);
}

----------------------


export function createTransferInstruction(
    source: PublicKey,
    destination: PublicKey,
    owner: PublicKey,
    amount: number | bigint,
    multiSigners: (Signer | PublicKey)[] = [],
    programId = TOKEN_PROGRAM_ID
): TransactionInstruction {
    const keys = addSigners(
        [
            { pubkey: source, isSigner: false, isWritable: true },
            { pubkey: destination, isSigner: false, isWritable: true },
        ],
        owner,
        multiSigners
    );

    const data = Buffer.alloc(transferInstructionData.span);
    transferInstructionData.encode(
        {
            instruction: TokenInstruction.Transfer,
            amount: BigInt(amount),
        },
        data
    );

    return new TransactionInstruction({ keys, programId, data });
}

-----------------
    
    /** TODO: docs 
export const transferInstructionData = struct<TransferInstructionData>([u8('instruction'), u64('amount')]);

//--------------------------------------

export function createApproveInstruction(
    account: PublicKey,
    delegate: PublicKey,
    owner: PublicKey,
    amount: number | bigint,
    multiSigners: (Signer | PublicKey)[] = [],
    programId = TOKEN_PROGRAM_ID
): TransactionInstruction {
    const keys = addSigners(
        [
            { pubkey: account, isSigner: false, isWritable: true },
            { pubkey: delegate, isSigner: false, isWritable: false },
        ],
        owner,
        multiSigners
    );

    const data = Buffer.alloc(approveInstructionData.span);
    approveInstructionData.encode(
        {
            instruction: TokenInstruction.Approve,
            amount: BigInt(amount),
        },
        data
    );

    return new TransactionInstruction({ keys, programId, data });
}

//-------------------------------------------

/** Authority types defined by the program 
export enum AuthorityType {
    MintTokens = 0,
    FreezeAccount = 1,
    AccountOwner = 2,
    CloseAccount = 3,
}

export function createSetAuthorityInstruction(
    account: PublicKey,
    currentAuthority: PublicKey,
    authorityType: AuthorityType,
    newAuthority: PublicKey | null,
    multiSigners: (Signer | PublicKey)[] = [],
    programId = TOKEN_PROGRAM_ID
): TransactionInstruction {
    const keys = addSigners([{ pubkey: account, isSigner: false, isWritable: true }], currentAuthority, multiSigners);

    const data = Buffer.alloc(setAuthorityInstructionData.span);
    setAuthorityInstructionData.encode(
        {
            instruction: TokenInstruction.SetAuthority,
            authorityType,
            newAuthorityOption: newAuthority ? 1 : 0,
            newAuthority: newAuthority || new PublicKey(0),
        },
        data
    );

    return new TransactionInstruction({ keys, programId, data });
}

//-------------------------------------------


/**
 * Construct a Revoke instruction
 *
 * @param account      Address of the token account
 * @param owner        Owner of the account
 * @param multiSigners Signing accounts if `owner` is a multisig
 * @param programId    SPL Token program account
 *
 * @return Instruction to add to a transaction
 //
export function createRevokeInstruction(
    account: PublicKey,
    owner: PublicKey,
    multiSigners: (Signer | PublicKey)[] = [],
    programId = TOKEN_PROGRAM_ID
): TransactionInstruction {
    const keys = addSigners([{ pubkey: account, isSigner: false, isWritable: true }], owner, multiSigners);

    const data = Buffer.alloc(revokeInstructionData.span);
    revokeInstructionData.encode({ instruction: TokenInstruction.Revoke }, data);

    return new TransactionInstruction({ keys, programId, data });
}


//-------------------------------------------------

/**
 * Construct a MintTo instruction
 *
 * @param mint         Public key of the mint
 * @param destination  Address of the token account to mint to
 * @param authority    The mint authority
 * @param amount       Amount to mint
 * @param multiSigners Signing accounts if `authority` is a multisig
 * @param programId    SPL Token program account
 *
 * @return Instruction to add to a transaction
 *
export function createMintToInstruction(
    mint: PublicKey,
    destination: PublicKey,
    authority: PublicKey,
    amount: number | bigint,
    multiSigners: (Signer | PublicKey)[] = [],
    programId = TOKEN_PROGRAM_ID
): TransactionInstruction {
    const keys = addSigners(
        [
            { pubkey: mint, isSigner: false, isWritable: true },
            { pubkey: destination, isSigner: false, isWritable: true },
        ],
        authority,
        multiSigners
    );

    const data = Buffer.alloc(mintToInstructionData.span);
    mintToInstructionData.encode(
        {
            instruction: TokenInstruction.MintTo,
            amount: BigInt(amount),
        },

//------------------------


/** TODO: docs /
export const initializeMintInstructionData = struct<InitializeMintInstructionData>([
    u8('instruction'),
    u8('decimals'),
    publicKey('mintAuthority'),
    u8('freezeAuthorityOption'),
    publicKey('freezeAuthority'),
]);

/** Mint as stored by the program /
export interface RawMint {
    mintAuthorityOption: 1 | 0;
    mintAuthority: PublicKey;
    supply: bigint;
    decimals: number;
    isInitialized: boolean;
    freezeAuthorityOption: 1 | 0;
    freezeAuthority: PublicKey;
}

/** Buffer layout for de/serializing a mint /
export const MintLayout = struct<RawMint>([
    u32('mintAuthorityOption'),             4+32+8+1+4+4+32 = [64 +16 +5] = 85 ?
    publicKey('mintAuthority'),
    u64('supply'),
    u8('decimals'),
    bool('isInitialized'),
    u32('freezeAuthorityOption'),
    publicKey('freezeAuthority'),
]);

/** Byte length of a mint /
export const MINT_SIZE = MintLayout.span;


*/




/** Instructions defined by the program */
export enum TokenInstruction {
    InitializeMint = 0,
    InitializeAccount = 1,
    InitializeMultisig = 2,
    Transfer = 3,
    Approve = 4,
    Revoke = 5,
    SetAuthority = 6,
    MintTo = 7,
    Burn = 8,
    CloseAccount = 9,
    FreezeAccount = 10,
    ThawAccount = 11,
    TransferChecked = 12,
    ApproveChecked = 13,
    MintToChecked = 14,
    BurnChecked = 15,
    InitializeAccount2 = 16,
    SyncNative = 17,
    InitializeAccount3 = 18,
    InitializeMultisig2 = 19,
    InitializeMint2 = 20,
    GetAccountDataSize = 21,
    InitializeImmutableOwner = 22,
    AmountToUiAmount = 23,
    UiAmountToAmount = 24,
    InitializeMintCloseAuthority = 25,
    TransferFeeExtension = 26,
    ConfidentialTransferExtension = 27,
    DefaultAccountStateExtension = 28,
    Reallocate = 29,
    MemoTransferExtension = 30,
    CreateNativeMint = 31,
    InitializeNonTransferableMint = 32,
    InterestBearingMintExtension = 33,
    CpiGuardExtension = 34,
    InitializePermanentDelegate = 35,
}
