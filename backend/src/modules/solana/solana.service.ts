import { createHash } from 'node:crypto';
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js';
import { env } from '../../config/env.js';

type SolanaStatus = 'confirmed' | 'stubbed' | 'skipped';

export type SolanaResult = {
  status: SolanaStatus;
  txSignature: string | null;
  pda?: string;
};

export interface SolanaService {
  registerClinic(input: { clinicId: string; name: string }): Promise<SolanaResult>;
  registerPatient(input: { patientId: string }): Promise<SolanaResult>;
  registerDoctor(input: { doctorId: string; licenseNumberHash?: string | null; clinicId?: string | null }): Promise<SolanaResult>;
  registerDocumentHash(input: {
    documentId: string;
    patientId: string;
    doctorId: string;
    consentId: string;
    documentType: string;
    fileHash: string;
    metadataHash?: string | null;
  }): Promise<SolanaResult>;
  recordConsent(input: {
    consentId: string;
    patientId: string;
    doctorId: string;
    scope: string;
    expiresAt?: string | null;
    status: 'approved' | 'revoked' | 'expired';
  }): Promise<SolanaResult>;
  recordAccessLog(input: {
    auditLogId: string;
    patientId?: string | null;
    doctorId?: string | null;
    documentId?: string | null;
    action: string;
    status: string;
  }): Promise<SolanaResult>;
}

const PROGRAM_ID = env.SOLANA_PROGRAM_ID ? new PublicKey(env.SOLANA_PROGRAM_ID) : null;
const connection = env.SOLANA_RPC_URL ? new Connection(env.SOLANA_RPC_URL, 'confirmed') : null;
const payer = env.SOLANA_PAYER_PRIVATE_KEY ? parseKeypair(env.SOLANA_PAYER_PRIVATE_KEY) : null;

function isEnabled() {
  return Boolean(PROGRAM_ID && connection && payer);
}

function stubbed(): SolanaResult {
  return { status: 'stubbed', txSignature: null };
}

function skipped(): SolanaResult {
  return { status: 'skipped', txSignature: null };
}

function parseKeypair(secret: string) {
  const trimmed = secret.trim();
  if (trimmed.startsWith('[')) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed) as number[]));
  }

  return Keypair.fromSecretKey(Buffer.from(trimmed, 'base64'));
}

function uuidBytes(uuid: string) {
  const hex = uuid.replaceAll('-', '');
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error(`Invalid UUID: ${uuid}`);
  }

  return Buffer.from(hex, 'hex');
}

function hashBytes(value: string) {
  return createHash('sha256').update(value).digest();
}

function hexHashBytes(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error('Expected a 32-byte hex hash');
  }

  return Buffer.from(normalized, 'hex');
}

function optionBytes(value: Buffer | null) {
  return value ? Buffer.concat([Buffer.from([1]), value]) : Buffer.from([0]);
}

function optionI64(value?: string | null) {
  if (!value) {
    return Buffer.from([0]);
  }

  const seconds = BigInt(Math.floor(new Date(value).getTime() / 1000));
  const buffer = Buffer.alloc(9);
  buffer[0] = 1;
  buffer.writeBigInt64LE(seconds, 1);
  return buffer;
}

function instructionData(name: string, ...args: Buffer[]) {
  const discriminator = createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
  return Buffer.concat([discriminator, ...args]);
}

function pda(seed: string, id: string) {
  if (!PROGRAM_ID) {
    throw new Error('SOLANA_PROGRAM_ID is not configured');
  }

  return PublicKey.findProgramAddressSync([Buffer.from(seed), uuidBytes(id)], PROGRAM_ID)[0];
}

async function sendIx(ix: TransactionInstruction) {
  if (!connection || !payer) {
    return null;
  }

  const tx = new Transaction().add(ix);
  return sendAndConfirmTransaction(connection, tx, [payer], { commitment: 'confirmed' });
}

function ix(programId: PublicKey, keys: TransactionInstruction['keys'], data: Buffer) {
  return new TransactionInstruction({ programId, keys, data });
}

const auditActionMap: Record<string, number> = {
  request_access: 0,
  approve: 1,
  reject: 2,
  revoke: 3,
  upload: 4,
  view: 5,
  download: 6
};

const auditStatusMap: Record<string, number> = {
  success: 0,
  denied: 1,
  failed: 2
};

export const solanaService: SolanaService = {
  async registerClinic(input) {
    if (!isEnabled() || !PROGRAM_ID || !payer) {
      return stubbed();
    }

    const clinic = pda('clinic', input.clinicId);
    const signature = await sendIx(
      ix(
        PROGRAM_ID,
        [
          { pubkey: clinic, isSigner: false, isWritable: true },
          { pubkey: payer.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        instructionData('register_clinic', uuidBytes(input.clinicId), hashBytes(input.name))
      )
    );

    return { status: 'confirmed', txSignature: signature, pda: clinic.toBase58() };
  },

  async registerPatient(input) {
    if (!isEnabled() || !PROGRAM_ID || !payer) {
      return stubbed();
    }

    const patient = pda('patient', input.patientId);
    const signature = await sendIx(
      ix(
        PROGRAM_ID,
        [
          { pubkey: patient, isSigner: false, isWritable: true },
          { pubkey: payer.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        instructionData('register_patient', uuidBytes(input.patientId))
      )
    );

    return { status: 'confirmed', txSignature: signature, pda: patient.toBase58() };
  },

  async registerDoctor(input) {
    if (!isEnabled() || !PROGRAM_ID || !payer) {
      return stubbed();
    }

    const doctor = pda('doctor', input.doctorId);
    const licenseHash = hexHashBytes(input.licenseNumberHash) ?? Buffer.alloc(32);
    const signature = await sendIx(
      ix(
        PROGRAM_ID,
        [
          { pubkey: doctor, isSigner: false, isWritable: true },
          { pubkey: payer.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        instructionData('register_doctor', uuidBytes(input.doctorId), licenseHash, optionBytes(input.clinicId ? uuidBytes(input.clinicId) : null))
      )
    );

    return { status: 'confirmed', txSignature: signature, pda: doctor.toBase58() };
  },

  async registerDocumentHash(input) {
    if (!isEnabled() || !PROGRAM_ID || !payer) {
      return stubbed();
    }

    const document = pda('document', input.documentId);
    const patient = pda('patient', input.patientId);
    const doctor = pda('doctor', input.doctorId);
    const consent = pda('consent', input.consentId);
    const signature = await sendIx(
      ix(
        PROGRAM_ID,
        [
          { pubkey: document, isSigner: false, isWritable: true },
          { pubkey: patient, isSigner: false, isWritable: false },
          { pubkey: doctor, isSigner: false, isWritable: false },
          { pubkey: consent, isSigner: false, isWritable: false },
          { pubkey: payer.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        instructionData(
          'record_document_hash',
          uuidBytes(input.documentId),
          hashBytes(input.documentType),
          hexHashBytes(input.fileHash) ?? Buffer.alloc(32),
          optionBytes(hexHashBytes(input.metadataHash))
        )
      )
    );

    return { status: 'confirmed', txSignature: signature, pda: document.toBase58() };
  },

  async recordConsent(input) {
    if (!isEnabled() || !PROGRAM_ID || !payer) {
      return stubbed();
    }

    const consent = pda('consent', input.consentId);
    const patient = pda('patient', input.patientId);
    const doctor = pda('doctor', input.doctorId);

    if (input.status === 'expired') {
      return skipped();
    }

    const data =
      input.status === 'approved'
        ? instructionData('grant_consent', uuidBytes(input.consentId), hashBytes(input.scope), optionI64(input.expiresAt))
        : instructionData('revoke_consent');

    const keys =
      input.status === 'approved'
        ? [
            { pubkey: consent, isSigner: false, isWritable: true },
            { pubkey: patient, isSigner: false, isWritable: false },
            { pubkey: doctor, isSigner: false, isWritable: false },
            { pubkey: payer.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
          ]
        : [
            { pubkey: consent, isSigner: false, isWritable: true },
            { pubkey: patient, isSigner: false, isWritable: false },
            { pubkey: payer.publicKey, isSigner: true, isWritable: false }
          ];

    const signature = await sendIx(ix(PROGRAM_ID, keys, data));
    return { status: 'confirmed', txSignature: signature, pda: consent.toBase58() };
  },

  async recordAccessLog(input) {
    if (!isEnabled() || !PROGRAM_ID || !payer) {
      return stubbed();
    }
    if (!input.patientId || !input.doctorId || !input.documentId) {
      return skipped();
    }

    const action = auditActionMap[input.action];
    const status = auditStatusMap[input.status];
    if (action === undefined || status === undefined) {
      return skipped();
    }

    const auditLog = pda('access_log', input.auditLogId);
    const signature = await sendIx(
      ix(
        PROGRAM_ID,
        [
          { pubkey: auditLog, isSigner: false, isWritable: true },
          { pubkey: pda('patient', input.patientId), isSigner: false, isWritable: false },
          { pubkey: pda('doctor', input.doctorId), isSigner: false, isWritable: false },
          { pubkey: pda('document', input.documentId), isSigner: false, isWritable: false },
          { pubkey: payer.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        instructionData('record_access_log', uuidBytes(input.auditLogId), Buffer.from([action]), Buffer.from([status]))
      )
    );

    return { status: 'confirmed', txSignature: signature, pda: auditLog.toBase58() };
  }
};
