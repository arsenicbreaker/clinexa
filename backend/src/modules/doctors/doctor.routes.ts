import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase.js';
import { type AuthedRequest, requireRole } from '../../middleware/auth.middleware.js';
import { sha256Hex } from '../../utils/hash.js';
import { sendCreated } from '../../utils/http.js';

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

    const { data, error } = await supabaseAdmin
      .from('doctors')
      .insert({
        profile_id: authed.user.id,
        clinic_id: body.clinicId ?? null,
        license_number_hash: body.licenseNumber ? sha256Hex(body.licenseNumber) : null,
        specialization: body.specialization ?? null
      })
      .select('id,profile_id,clinic_id,specialization,onchain_doctor_pda,created_at')
      .single();

    if (error) {
      throw error;
    }

    return sendCreated(res, data);
  } catch (error) {
    next(error);
  }
});

export { router as doctorRoutes };
