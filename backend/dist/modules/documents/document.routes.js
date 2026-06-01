import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { MEDICAL_BUCKET, supabaseAdmin } from '../../config/supabase.js';
import { requireProfile, requireRole } from '../../middleware/auth.middleware.js';
import { sha256Hex } from '../../utils/hash.js';
import { HttpError, sendCreated } from '../../utils/http.js';
import { createAccessLog } from '../audit/audit.service.js';
import { decryptBuffer, encryptBuffer, encryptJson } from '../encryption/encryption.service.js';
import { solanaService } from '../solana/solana.service.js';
import { serializeDocument } from './document.serializer.js';
const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const createDocumentSchema = z.object({
    patientId: z.string().uuid(),
    doctorId: z.string().uuid(),
    clinicId: z.string().uuid().optional(),
    documentType: z.string().min(2).max(80),
    title: z.string().max(180).optional(),
    metadata: z.string().optional()
});
async function getOwnDoctor(profileId, doctorId) {
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
async function hasActiveConsent(patientId, doctorId) {
    const { data, error } = await supabaseAdmin.rpc('has_active_consent', {
        p_patient_id: patientId,
        p_doctor_id: doctorId
    });
    if (error) {
        throw error;
    }
    return data === true;
}
async function getPatientForProfile(profileId, patientId) {
    const { data, error } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('id', patientId)
        .eq('profile_id', profileId)
        .maybeSingle();
    if (error) {
        throw error;
    }
    return data;
}
function parseMetadata(metadata) {
    if (!metadata) {
        return {};
    }
    try {
        const parsed = JSON.parse(metadata);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Metadata must be a JSON object');
        }
        return parsed;
    }
    catch {
        throw new HttpError(400, 'metadata must be a valid JSON object string');
    }
}
router.post('/documents', upload.single('file'), async (req, res, next) => {
    try {
        const profile = requireRole(req, ['doctor']);
        if (!req.file) {
            throw new HttpError(400, 'Missing medical file');
        }
        const body = createDocumentSchema.parse(req.body);
        const doctor = await getOwnDoctor(profile.id, body.doctorId);
        const allowed = await hasActiveConsent(body.patientId, doctor.id);
        if (!allowed) {
            await createAccessLog({
                patientId: body.patientId,
                doctorId: doctor.id,
                actorProfileId: profile.id,
                action: 'upload',
                status: 'denied',
                reason: 'Missing active consent'
            });
            throw new HttpError(403, 'Active consent is required to upload documents');
        }
        const parsedMetadata = parseMetadata(body.metadata);
        const encryptedFile = encryptBuffer(req.file.buffer);
        const fileHash = sha256Hex(encryptedFile);
        const metadataHash = sha256Hex(JSON.stringify(parsedMetadata));
        const storagePath = `${body.patientId}/${randomUUID()}.bin.enc`;
        const { error: uploadError } = await supabaseAdmin.storage
            .from(MEDICAL_BUCKET)
            .upload(storagePath, encryptedFile, {
            contentType: 'application/octet-stream',
            upsert: false
        });
        if (uploadError) {
            throw uploadError;
        }
        const { data, error } = await supabaseAdmin
            .from('medical_documents')
            .insert({
            patient_id: body.patientId,
            uploaded_by_doctor_id: doctor.id,
            clinic_id: body.clinicId ?? doctor.clinic_id,
            document_type: body.documentType,
            encrypted_title: body.title ? encryptJson({ title: body.title }) : null,
            encrypted_metadata: encryptJson(parsedMetadata),
            storage_bucket: MEDICAL_BUCKET,
            storage_path: storagePath,
            file_hash: fileHash,
            metadata_hash: metadataHash
        })
            .select('id,patient_id,uploaded_by_doctor_id,clinic_id,document_type,file_hash,metadata_hash,onchain_document_pda,created_at')
            .single();
        if (error) {
            throw error;
        }
        await solanaService.registerDocumentHash({
            documentId: data.id,
            fileHash: data.file_hash,
            metadataHash: data.metadata_hash
        });
        await createAccessLog({
            patientId: body.patientId,
            doctorId: doctor.id,
            documentId: data.id,
            actorProfileId: profile.id,
            action: 'upload',
            status: 'success'
        });
        return sendCreated(res, data);
    }
    catch (error) {
        next(error);
    }
});
router.get('/patients/:patientId/documents', async (req, res, next) => {
    try {
        const profile = requireProfile(req);
        let allowed = false;
        if (profile.role === 'patient') {
            allowed = Boolean(await getPatientForProfile(profile.id, req.params.patientId));
        }
        if (profile.role === 'doctor') {
            const { data: doctor, error } = await supabaseAdmin
                .from('doctors')
                .select('id')
                .eq('profile_id', profile.id)
                .maybeSingle();
            if (error) {
                throw error;
            }
            allowed = doctor ? await hasActiveConsent(req.params.patientId, doctor.id) : false;
        }
        if (!allowed) {
            throw new HttpError(403, 'Document access denied');
        }
        const { data, error } = await supabaseAdmin
            .from('medical_documents')
            .select('id,patient_id,uploaded_by_doctor_id,clinic_id,document_type,file_hash,metadata_hash,onchain_document_pda,created_at')
            .eq('patient_id', req.params.patientId)
            .order('created_at', { ascending: false });
        if (error) {
            throw error;
        }
        res.json({ data: data.map(serializeDocument) });
    }
    catch (error) {
        next(error);
    }
});
router.get('/documents/:documentId', async (req, res, next) => {
    try {
        const profile = requireProfile(req);
        const { data: document, error } = await supabaseAdmin
            .from('medical_documents')
            .select('id,patient_id,uploaded_by_doctor_id,clinic_id,document_type,file_hash,metadata_hash,onchain_document_pda,created_at')
            .eq('id', req.params.documentId)
            .maybeSingle();
        if (error) {
            throw error;
        }
        if (!document) {
            throw new HttpError(404, 'Document not found');
        }
        if (profile.role === 'patient') {
            const ownsPatient = await getPatientForProfile(profile.id, document.patient_id);
            if (!ownsPatient) {
                throw new HttpError(403, 'Document access denied');
            }
        }
        if (profile.role === 'doctor') {
            const { data: doctor, error: doctorError } = await supabaseAdmin
                .from('doctors')
                .select('id')
                .eq('profile_id', profile.id)
                .maybeSingle();
            if (doctorError) {
                throw doctorError;
            }
            if (!doctor || !(await hasActiveConsent(document.patient_id, doctor.id))) {
                throw new HttpError(403, 'Document access denied');
            }
        }
        res.json({ data: serializeDocument(document) });
    }
    catch (error) {
        next(error);
    }
});
router.get('/documents/:documentId/download', async (req, res, next) => {
    try {
        const profile = requireProfile(req);
        const { data: document, error } = await supabaseAdmin
            .from('medical_documents')
            .select('id,patient_id,uploaded_by_doctor_id,storage_bucket,storage_path,document_type')
            .eq('id', req.params.documentId)
            .maybeSingle();
        if (error) {
            throw error;
        }
        if (!document) {
            throw new HttpError(404, 'Document not found');
        }
        let doctorId = null;
        let allowed = false;
        if (profile.role === 'patient') {
            allowed = Boolean(await getPatientForProfile(profile.id, document.patient_id));
        }
        if (profile.role === 'doctor') {
            const { data: doctor, error: doctorError } = await supabaseAdmin
                .from('doctors')
                .select('id')
                .eq('profile_id', profile.id)
                .maybeSingle();
            if (doctorError) {
                throw doctorError;
            }
            doctorId = doctor?.id ?? null;
            allowed = doctor ? await hasActiveConsent(document.patient_id, doctor.id) : false;
        }
        if (!allowed) {
            await createAccessLog({
                patientId: document.patient_id,
                doctorId,
                documentId: document.id,
                actorProfileId: profile.id,
                action: 'download',
                status: 'denied',
                reason: 'Missing active consent or patient ownership'
            });
            throw new HttpError(403, 'Document access denied');
        }
        const { data: encryptedBlob, error: downloadError } = await supabaseAdmin.storage
            .from(document.storage_bucket)
            .download(document.storage_path);
        if (downloadError) {
            throw downloadError;
        }
        const encrypted = Buffer.from(await encryptedBlob.arrayBuffer());
        const plain = decryptBuffer(encrypted);
        await createAccessLog({
            patientId: document.patient_id,
            doctorId,
            documentId: document.id,
            actorProfileId: profile.id,
            action: 'download',
            status: 'success'
        });
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${document.id}-${document.document_type}"`);
        return res.send(plain);
    }
    catch (error) {
        next(error);
    }
});
export { router as documentRoutes };
