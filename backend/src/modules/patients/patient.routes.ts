import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase.js';
import { type AuthedRequest, requireRole } from '../../middleware/auth.middleware.js';
import { encryptJson } from '../encryption/encryption.service.js';
import { sendCreated } from '../../utils/http.js';

const router = Router();

const createPatientSchema = z.object({
  patientCode: z.string().min(3).max(80),
  demographics: z.record(z.unknown()).optional()
});

router.post('/patients', async (req, res, next) => {
  try {
    requireRole(req, ['patient']);
    const authed = req as AuthedRequest;
    const body = createPatientSchema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('patients')
      .insert({
        profile_id: authed.user.id,
        patient_code: body.patientCode,
        encrypted_demographics: body.demographics ? encryptJson(body.demographics) : null
      })
      .select('id,profile_id,patient_code,onchain_patient_pda,created_at')
      .single();

    if (error) {
      throw error;
    }

    return sendCreated(res, data);
  } catch (error) {
    next(error);
  }
});

router.get('/patients/:patientId/access-logs', async (req, res, next) => {
  try {
    const profile = requireRole(req, ['patient']);

    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('id', req.params.patientId)
      .eq('profile_id', profile.id)
      .maybeSingle();

    if (patientError) {
      throw patientError;
    }
    if (!patient) {
      return res.status(403).json({ error: 'Patient access denied' });
    }

    const { data, error } = await supabaseAdmin
      .from('access_logs')
      .select('id,patient_id,doctor_id,document_id,action,status,reason,tx_signature,created_at')
      .eq('patient_id', req.params.patientId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

export { router as patientRoutes };
