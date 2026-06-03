import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase.js';
import { type AuthedRequest, requireRole } from '../../middleware/auth.middleware.js';
import { HttpError, sendCreated } from '../../utils/http.js';
import { createAccessLog } from '../audit/audit.service.js';
import { solanaService } from '../solana/solana.service.js';

const router = Router();

const requestConsentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  clinicId: z.string().uuid().optional(),
  scope: z.string().default('documents:read'),
  expiresAt: z.string().datetime().optional()
});

async function getOwnDoctor(profileId: string, doctorId: string) {
  const { data, error } = await supabaseAdmin
    .from('doctors')
    .select('id,clinic_id')
    .eq('id', doctorId)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new HttpError(403, 'Doctor access denied');
  }

  return data;
}

async function getConsentForPatient(profileId: string, consentId: string) {
  const { data, error } = await supabaseAdmin
    .from('consent_requests')
    .select('id,patient_id,doctor_id,status')
    .eq('id', consentId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new HttpError(404, 'Consent not found');
  }

  const { data: patient, error: patientError } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('id', data.patient_id)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (patientError) {
    throw patientError;
  }
  if (!patient) {
    throw new HttpError(403, 'Patient access denied');
  }

  return data;
}

router.post('/consents/request', async (req, res, next) => {
  try {
    const profile = requireRole(req, ['doctor']);
    const body = requestConsentSchema.parse(req.body);
    const doctor = await getOwnDoctor(profile.id, body.doctorId);

    const { data, error } = await supabaseAdmin
      .from('consent_requests')
      .insert({
        patient_id: body.patientId,
        doctor_id: doctor.id,
        clinic_id: body.clinicId ?? doctor.clinic_id,
        scope: body.scope,
        expires_at: body.expiresAt ?? null
      })
      .select('id,patient_id,doctor_id,clinic_id,status,scope,expires_at,created_at')
      .single();

    if (error) {
      throw error;
    }

    await createAccessLog({
      patientId: body.patientId,
      doctorId: doctor.id,
      actorProfileId: profile.id,
      action: 'request_access',
      status: 'success'
    });

    return sendCreated(res, data);
  } catch (error) {
    next(error);
  }
});

router.post('/consents/:consentId/approve', async (req, res, next) => {
  try {
    const profile = requireRole(req, ['patient']);
    const consent = await getConsentForPatient(profile.id, req.params.consentId);

    const { data, error } = await supabaseAdmin
      .from('consent_requests')
      .update({ status: 'approved' })
      .eq('id', consent.id)
      .select('id,patient_id,doctor_id,clinic_id,status,scope,expires_at,onchain_consent_pda,updated_at')
      .single();

    if (error) {
      throw error;
    }

    const onchain = await solanaService.recordConsent({
      consentId: data.id,
      patientId: data.patient_id,
      doctorId: data.doctor_id,
      scope: data.scope,
      expiresAt: data.expires_at,
      status: 'approved'
    });
    if (onchain.pda) {
      const { error: updateError } = await supabaseAdmin
        .from('consent_requests')
        .update({ onchain_consent_pda: onchain.pda })
        .eq('id', data.id);

      if (updateError) {
        throw updateError;
      }

      data.onchain_consent_pda = onchain.pda;
    }

    await createAccessLog({
      patientId: data.patient_id,
      doctorId: data.doctor_id,
      actorProfileId: profile.id,
      action: 'approve',
      status: 'success'
    });

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/consents/:consentId/reject', async (req, res, next) => {
  try {
    const profile = requireRole(req, ['patient']);
    const consent = await getConsentForPatient(profile.id, req.params.consentId);

    const { data, error } = await supabaseAdmin
      .from('consent_requests')
      .update({ status: 'rejected' })
      .eq('id', consent.id)
      .select('id,patient_id,doctor_id,clinic_id,status,scope,expires_at,onchain_consent_pda,updated_at')
      .single();

    if (error) {
      throw error;
    }

    await createAccessLog({
      patientId: data.patient_id,
      doctorId: data.doctor_id,
      actorProfileId: profile.id,
      action: 'reject',
      status: 'success'
    });

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/consents/:consentId/revoke', async (req, res, next) => {
  try {
    const profile = requireRole(req, ['patient']);
    const consent = await getConsentForPatient(profile.id, req.params.consentId);

    const { data, error } = await supabaseAdmin
      .from('consent_requests')
      .update({ status: 'revoked' })
      .eq('id', consent.id)
      .select('id,patient_id,doctor_id,clinic_id,status,scope,expires_at,onchain_consent_pda,updated_at')
      .single();

    if (error) {
      throw error;
    }

    const onchain = await solanaService.recordConsent({
      consentId: data.id,
      patientId: data.patient_id,
      doctorId: data.doctor_id,
      scope: data.scope,
      expiresAt: data.expires_at,
      status: 'revoked'
    });
    if (onchain.pda) {
      data.onchain_consent_pda = onchain.pda;
    }

    await createAccessLog({
      patientId: data.patient_id,
      doctorId: data.doctor_id,
      actorProfileId: profile.id,
      action: 'revoke',
      status: 'success'
    });

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/consents/patient/:patientId', async (req, res, next) => {
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
      throw new HttpError(403, 'Patient access denied');
    }

    const { data, error } = await supabaseAdmin
      .from('consent_requests')
      .select('id,patient_id,doctor_id,clinic_id,status,scope,expires_at,onchain_consent_pda,created_at,updated_at')
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

router.get('/consents/doctor/:doctorId', async (req, res, next) => {
  try {
    const profile = requireRole(req, ['doctor']);
    const doctor = await getOwnDoctor(profile.id, req.params.doctorId);

    const { data, error } = await supabaseAdmin
      .from('consent_requests')
      .select('id,patient_id,doctor_id,clinic_id,status,scope,expires_at,onchain_consent_pda,created_at,updated_at')
      .eq('doctor_id', doctor.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

export { router as consentRoutes };
