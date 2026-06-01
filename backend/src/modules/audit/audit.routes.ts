import { Router } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { requireProfile } from '../../middleware/auth.middleware.js';
import { HttpError } from '../../utils/http.js';

const router = Router();

router.get('/audit/patient/:patientId', async (req, res, next) => {
  try {
    const profile = requireProfile(req);

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
      throw new HttpError(403, 'Audit access denied');
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

export { router as auditRoutes };
