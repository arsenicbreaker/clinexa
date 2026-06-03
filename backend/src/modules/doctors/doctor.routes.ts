import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase.js';
import { type AuthedRequest, requireRole } from '../../middleware/auth.middleware.js';
import { sha256Hex } from '../../utils/hash.js';
import { sendCreated } from '../../utils/http.js';
import { solanaService } from '../solana/solana.service.js';

const router = Router();

const createDoctorSchema = z.object({
  clinicId: z.string().uuid().optional(),
  licenseNumber: z.string().min(3).optional(),
  specialization: z.string().max(120).optional()
});

router.post('/doctors', async (req, res, next) => {
  try {
    requireRole(req, ['doctor']);
    const authed = req as AuthedRequest;
    const body = createDoctorSchema.parse(req.body);
    const licenseNumberHash = body.licenseNumber ? sha256Hex(body.licenseNumber) : null;

    const { data, error } = await supabaseAdmin
      .from('doctors')
      .insert({
        profile_id: authed.user.id,
        clinic_id: body.clinicId ?? null,
        license_number_hash: licenseNumberHash,
        specialization: body.specialization ?? null
      })
      .select('id,profile_id,clinic_id,license_number_hash,specialization,onchain_doctor_pda,created_at')
      .single();

    if (error) {
      throw error;
    }

    const onchain = await solanaService.registerDoctor({
      doctorId: data.id,
      licenseNumberHash: data.license_number_hash,
      clinicId: data.clinic_id
    });
    if (onchain.pda) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('doctors')
        .update({ onchain_doctor_pda: onchain.pda })
        .eq('id', data.id)
        .select('id,profile_id,clinic_id,specialization,onchain_doctor_pda,created_at')
        .single();

      if (updateError) {
        throw updateError;
      }

      return sendCreated(res, updated);
    }

    const { license_number_hash: _licenseNumberHash, ...response } = data;
    return sendCreated(res, response);
  } catch (error) {
    next(error);
  }
});

export { router as doctorRoutes };
