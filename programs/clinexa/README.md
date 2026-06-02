# Clinexa Solana Program

Clinexa stores only verifiable references on-chain. Raw medical records, names, diagnosis text, Supabase storage paths, and other sensitive health data must stay off-chain and encrypted.

## Accounts

- `ClinicRegistry`: clinic UUID bytes, authority wallet, and hashed clinic display name.
- `PatientRegistry`: patient UUID bytes and patient authority wallet.
- `DoctorRegistry`: doctor UUID bytes, authority wallet, optional clinic UUID bytes, and hashed license number.
- `ConsentRecord`: patient PDA, doctor PDA, hashed scope, consent status, and optional expiry timestamp.
- `DocumentRecord`: patient PDA, uploader doctor PDA, consent PDA, document type hash, file hash, and optional metadata hash.
- `AccessLog`: patient PDA, doctor PDA, document PDA, actor wallet, action, status, and timestamp.

## Backend Encoding Notes

- Supabase UUID values should be decoded into raw 16-byte arrays before deriving PDAs.
- File hashes and metadata hashes should be 32-byte digests, preferably SHA-256.
- Text fields such as document type, consent scope, clinic name, and license numbers should be hashed before reaching Solana.
