import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase.js';
import { type AuthedRequest } from '../../middleware/auth.middleware.js';

const router = Router();

const linkWalletSchema = z.object({
  walletAddress: z.string().min(32),
  role: z.enum(['patient', 'doctor', 'clinic_admin']),
  displayName: z.string().min(1).max(120).optional()
});

router.get('/me', async (req, res, next) => {
  try {
    const authed = req as AuthedRequest;
    res.json({ data: { user: authed.user, profile: authed.profile } });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/link-wallet', async (req, res, next) => {
  try {
    const authed = req as AuthedRequest;
    const body = linkWalletSchema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: authed.user.id,
          wallet_address: body.walletAddress,
          role: body.role,
          display_name: body.displayName ?? null
        },
        { onConflict: 'id' }
      )
      .select('id,wallet_address,role,display_name,created_at,updated_at')
      .single();

    if (error) {
      throw error;
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes };
