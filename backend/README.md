# Clinexa Backend

Minimal backend scaffold for the Clinexa MVP.

## Scope

- Supabase stores encrypted off-chain medical files and metadata.
- Solana is currently represented by `SolanaService`, a no-op interface stub for future Anchor integration.
- Raw medical data is never stored on-chain.
- Supabase Storage paths are never returned by API serializers.
- Doctors must have active consent before accessing or uploading patient documents.

## Setup

```bash
cp .env.example .env
npm install
npm run build
npm run dev
```

Generate the encryption key with:

```bash
openssl rand -base64 32
```

Apply `supabase/migrations/001_initial_schema.sql` to the Supabase project before running the API.

## Solana Mode

If `SOLANA_RPC_URL`, `SOLANA_PROGRAM_ID`, and `SOLANA_PAYER_PRIVATE_KEY` are set, the backend sends transactions to the Clinexa Solana program. If any of them are omitted, `SolanaService` stays in stub mode and the API keeps working without on-chain writes.

For local development:

```bash
solana-test-validator
anchor deploy
```

For devnet, set `SOLANA_RPC_URL=https://api.devnet.solana.com`, fund the backend payer wallet, and deploy the program with the same program id configured in `SOLANA_PROGRAM_ID`.

## Upload Flow

`POST /documents` expects `multipart/form-data`:

- `file`: medical file
- `patientId`
- `doctorId`
- `documentType`
- `clinicId` optional
- `title` optional
- `metadata` optional JSON string

The backend encrypts the file before upload, stores only encrypted bytes in Supabase Storage, and returns no storage path.
