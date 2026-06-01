import { supabaseAdmin } from '../../config/supabase.js';
import { solanaService } from '../solana/solana.service.js';

export type AuditAction = 'request_access' | 'approve' | 'reject' | 'revoke' | 'upload' | 'view' | 'download';
export type AuditStatus = 'success' | 'denied' | 'failed';

export async function createAccessLog(input: {
  patientId?: string | null;
  doctorId?: string | null;
  documentId?: string | null;
  actorProfileId?: string | null;
  action: AuditAction;
  status: AuditStatus;
  reason?: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from('access_logs')
    .insert({
      patient_id: input.patientId ?? null,
      doctor_id: input.doctorId ?? null,
      document_id: input.documentId ?? null,
      actor_profile_id: input.actorProfileId ?? null,
      action: input.action,
      status: input.status,
      reason: input.reason ?? null
    })
    .select('id,action,status')
    .single();

  if (error) {
    throw error;
  }

  await solanaService.recordAccessLog({
    auditLogId: data.id,
    action: data.action,
    status: data.status
  });

  return data;
}
