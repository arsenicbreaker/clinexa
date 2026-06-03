import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const optionalEnv = z.preprocess((value) => (value === '' ? undefined : value), z.string().min(1).optional());

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  APP_ENCRYPTION_KEY: z.string().min(1),
  SOLANA_RPC_URL: z.preprocess((value) => (value === '' ? undefined : value), z.string().url().optional()),
  SOLANA_PROGRAM_ID: optionalEnv,
  SOLANA_PAYER_PRIVATE_KEY: optionalEnv
});

export const env = envSchema.parse(process.env);
