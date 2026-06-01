import { supabaseAdmin } from '../../config/supabase.js';
import { solanaService } from '../solana/solana.service.js';
export async function createAccessLog(input) {
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
