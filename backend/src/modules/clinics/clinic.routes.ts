import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase.js';
import { type AuthedRequest, requireRole } from '../../middleware/auth.middleware.js';
import { sendCreated } from '../../utils/http.js';
import { solanaService } from '../solana/solana.service.js';

const router = Router();

const createClinicSchema = z.object({
  name: z.string().min(2).max(160),
  walletAddress: z.string().min(32).optional()
});

router.post('/clinics', async (req, res, next) => {
  try {
    requireRole(req, ['clinic_admin']);
    const authed = req as AuthedRequest;
    const body = createClinicSchema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('clinics')
      .insert({
        name: body.name,
        wallet_address: body.walletAddress ?? null,
        created_by: authed.user.id
      })
      .select('id,name,wallet_address,onchain_clinic_pda,created_at')
      .single();

    if (error) {
      throw error;
    }

    const onchain = await solanaService.registerClinic({ clinicId: data.id, name: data.name });
    if (onchain.pda) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('clinics')
        .update({ onchain_clinic_pda: onchain.pda })
        .eq('id', data.id)
        .select('id,name,wallet_address,onchain_clinic_pda,created_at')
        .single();

      if (updateError) {
        throw updateError;
      }

      return sendCreated(res, updated);
    }

    return sendCreated(res, data);
  } catch (error) {
    next(error);
  }
});

export { router as clinicRoutes };
