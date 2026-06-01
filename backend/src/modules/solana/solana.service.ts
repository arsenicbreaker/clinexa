export type SolanaStubResult = {
  status: 'stubbed';
  txSignature: null;
};

export interface SolanaService {
  registerPatient(input: { patientId: string; patientWallet?: string }): Promise<SolanaStubResult>;
  registerDocumentHash(input: { documentId: string; fileHash: string; metadataHash?: string }): Promise<SolanaStubResult>;
  recordConsent(input: { consentId: string; status: 'approved' | 'revoked' | 'expired' }): Promise<SolanaStubResult>;
  recordAccessLog(input: { auditLogId: string; action: string; status: string }): Promise<SolanaStubResult>;
}

export const solanaService: SolanaService = {
  async registerPatient() {
    return { status: 'stubbed', txSignature: null };
  },
  async registerDocumentHash() {
    return { status: 'stubbed', txSignature: null };
  },
  async recordConsent() {
    return { status: 'stubbed', txSignature: null };
  },
  async recordAccessLog() {
    return { status: 'stubbed', txSignature: null };
  }
};
