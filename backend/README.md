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
