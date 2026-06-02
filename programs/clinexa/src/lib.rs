#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("Fc3XwtPFqwkjr4gsQ4uGbcxeyUJ6SbasRyEWLhM9wPV6");

const UUID_BYTES: usize = 16;
const HASH_BYTES: usize = 32;

#[program]
pub mod clinexa {
    use super::*;

    pub fn register_clinic(
        ctx: Context<RegisterClinic>,
        clinic_id: [u8; UUID_BYTES],
        name_hash: [u8; HASH_BYTES],
    ) -> Result<()> {
        let clinic = &mut ctx.accounts.clinic;
        clinic.clinic_id = clinic_id;
        clinic.authority = ctx.accounts.authority.key();
        clinic.name_hash = name_hash;
        clinic.created_at = Clock::get()?.unix_timestamp;
        clinic.bump = ctx.bumps.clinic;
        Ok(())
    }

    pub fn register_patient(
        ctx: Context<RegisterPatient>,
        patient_id: [u8; UUID_BYTES],
    ) -> Result<()> {
        let patient = &mut ctx.accounts.patient;
        patient.patient_id = patient_id;
        patient.authority = ctx.accounts.authority.key();
        patient.created_at = Clock::get()?.unix_timestamp;
        patient.bump = ctx.bumps.patient;
        Ok(())
    }

    pub fn register_doctor(
        ctx: Context<RegisterDoctor>,
        doctor_id: [u8; UUID_BYTES],
        license_number_hash: [u8; HASH_BYTES],
        clinic_id: Option<[u8; UUID_BYTES]>,
    ) -> Result<()> {
        let doctor = &mut ctx.accounts.doctor;
        doctor.doctor_id = doctor_id;
        doctor.authority = ctx.accounts.authority.key();
        doctor.clinic_id = clinic_id;
        doctor.license_number_hash = license_number_hash;
        doctor.created_at = Clock::get()?.unix_timestamp;
        doctor.bump = ctx.bumps.doctor;
        Ok(())
    }

    pub fn record_document_hash(
        ctx: Context<RecordDocumentHash>,
        document_id: [u8; UUID_BYTES],
        document_type_hash: [u8; HASH_BYTES],
        file_hash: [u8; HASH_BYTES],
        metadata_hash: Option<[u8; HASH_BYTES]>,
    ) -> Result<()> {
        require!(
            ctx.accounts.consent.patient == ctx.accounts.patient.key(),
            ClinexaError::ConsentPatientMismatch
        );
        require!(
            ctx.accounts.consent.doctor == ctx.accounts.doctor.key(),
            ClinexaError::ConsentDoctorMismatch
        );
        require!(
            ctx.accounts.doctor.authority == ctx.accounts.uploader.key(),
            ClinexaError::UnauthorizedDoctor
        );
        require!(
            ctx.accounts.consent.is_active(Clock::get()?.unix_timestamp),
            ClinexaError::ConsentNotActive
        );

        let document = &mut ctx.accounts.document;
        document.document_id = document_id;
        document.patient = ctx.accounts.patient.key();
        document.uploader_doctor = ctx.accounts.doctor.key();
        document.consent = ctx.accounts.consent.key();
        document.document_type_hash = document_type_hash;
        document.file_hash = file_hash;
        document.metadata_hash = metadata_hash;
        document.created_at = Clock::get()?.unix_timestamp;
        document.bump = ctx.bumps.document;
        Ok(())
    }

    pub fn grant_consent(
        ctx: Context<GrantConsent>,
        consent_id: [u8; UUID_BYTES],
        scope_hash: [u8; HASH_BYTES],
        expires_at: Option<i64>,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        if let Some(expiry) = expires_at {
            require!(expiry > now, ClinexaError::InvalidExpiration);
        }

        require!(
            ctx.accounts.patient.authority == ctx.accounts.patient_authority.key(),
            ClinexaError::UnauthorizedPatient
        );

        let consent = &mut ctx.accounts.consent;
        consent.consent_id = consent_id;
        consent.patient = ctx.accounts.patient.key();
        consent.doctor = ctx.accounts.doctor.key();
        consent.scope_hash = scope_hash;
        consent.status = ConsentStatus::Approved;
        consent.expires_at = expires_at;
        consent.created_at = now;
        consent.updated_at = now;
        consent.bump = ctx.bumps.consent;
        Ok(())
    }

    pub fn revoke_consent(ctx: Context<RevokeConsent>) -> Result<()> {
        require!(
            ctx.accounts.patient.authority == ctx.accounts.patient_authority.key(),
            ClinexaError::UnauthorizedPatient
        );
        require!(
            ctx.accounts.consent.patient == ctx.accounts.patient.key(),
            ClinexaError::ConsentPatientMismatch
        );

        let consent = &mut ctx.accounts.consent;
        consent.status = ConsentStatus::Revoked;
        consent.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn record_access_log(
        ctx: Context<RecordAccessLog>,
        audit_log_id: [u8; UUID_BYTES],
        action: AuditAction,
        status: AuditStatus,
    ) -> Result<()> {
        let audit_log = &mut ctx.accounts.audit_log;
        audit_log.audit_log_id = audit_log_id;
        audit_log.patient = ctx.accounts.patient.key();
        audit_log.doctor = ctx.accounts.doctor.key();
        audit_log.document = ctx.accounts.document.key();
        audit_log.actor = ctx.accounts.actor.key();
        audit_log.action = action;
        audit_log.status = status;
        audit_log.created_at = Clock::get()?.unix_timestamp;
        audit_log.bump = ctx.bumps.audit_log;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(clinic_id: [u8; UUID_BYTES])]
pub struct RegisterClinic<'info> {
    #[account(
        init,
        payer = authority,
        space = ClinicRegistry::SPACE,
        seeds = [b"clinic", clinic_id.as_ref()],
        bump
    )]
    pub clinic: Account<'info, ClinicRegistry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(patient_id: [u8; UUID_BYTES])]
pub struct RegisterPatient<'info> {
    #[account(
        init,
        payer = authority,
        space = PatientRegistry::SPACE,
        seeds = [b"patient", patient_id.as_ref()],
        bump
    )]
    pub patient: Account<'info, PatientRegistry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(doctor_id: [u8; UUID_BYTES])]
pub struct RegisterDoctor<'info> {
    #[account(
        init,
        payer = authority,
        space = DoctorRegistry::SPACE,
        seeds = [b"doctor", doctor_id.as_ref()],
        bump
    )]
    pub doctor: Account<'info, DoctorRegistry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(document_id: [u8; UUID_BYTES])]
pub struct RecordDocumentHash<'info> {
    #[account(
        init,
        payer = uploader,
        space = DocumentRecord::SPACE,
        seeds = [b"document", document_id.as_ref()],
        bump
    )]
    pub document: Account<'info, DocumentRecord>,
    pub patient: Account<'info, PatientRegistry>,
    pub doctor: Account<'info, DoctorRegistry>,
    pub consent: Account<'info, ConsentRecord>,
    #[account(mut)]
    pub uploader: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(consent_id: [u8; UUID_BYTES])]
pub struct GrantConsent<'info> {
    #[account(
        init,
        payer = patient_authority,
        space = ConsentRecord::SPACE,
        seeds = [b"consent", consent_id.as_ref()],
        bump
    )]
    pub consent: Account<'info, ConsentRecord>,
    pub patient: Account<'info, PatientRegistry>,
    pub doctor: Account<'info, DoctorRegistry>,
    #[account(mut)]
    pub patient_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeConsent<'info> {
    #[account(mut)]
    pub consent: Account<'info, ConsentRecord>,
    pub patient: Account<'info, PatientRegistry>,
    pub patient_authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(audit_log_id: [u8; UUID_BYTES])]
pub struct RecordAccessLog<'info> {
    #[account(
        init,
        payer = actor,
        space = AccessLog::SPACE,
        seeds = [b"access_log", audit_log_id.as_ref()],
        bump
    )]
    pub audit_log: Account<'info, AccessLog>,
    pub patient: Account<'info, PatientRegistry>,
    pub doctor: Account<'info, DoctorRegistry>,
    pub document: Account<'info, DocumentRecord>,
    #[account(mut)]
    pub actor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ClinicRegistry {
    pub clinic_id: [u8; UUID_BYTES],
    pub authority: Pubkey,
    pub name_hash: [u8; HASH_BYTES],
    pub created_at: i64,
    pub bump: u8,
}

impl ClinicRegistry {
    pub const SPACE: usize = 8 + UUID_BYTES + 32 + HASH_BYTES + 8 + 1;
}

#[account]
pub struct PatientRegistry {
    pub patient_id: [u8; UUID_BYTES],
    pub authority: Pubkey,
    pub created_at: i64,
    pub bump: u8,
}

impl PatientRegistry {
    pub const SPACE: usize = 8 + UUID_BYTES + 32 + 8 + 1;
}

#[account]
pub struct DoctorRegistry {
    pub doctor_id: [u8; UUID_BYTES],
    pub authority: Pubkey,
    pub clinic_id: Option<[u8; UUID_BYTES]>,
    pub license_number_hash: [u8; HASH_BYTES],
    pub created_at: i64,
    pub bump: u8,
}

impl DoctorRegistry {
    pub const SPACE: usize = 8 + UUID_BYTES + 32 + (1 + UUID_BYTES) + HASH_BYTES + 8 + 1;
}

#[account]
pub struct DocumentRecord {
    pub document_id: [u8; UUID_BYTES],
    pub patient: Pubkey,
    pub uploader_doctor: Pubkey,
    pub consent: Pubkey,
    pub document_type_hash: [u8; HASH_BYTES],
    pub file_hash: [u8; HASH_BYTES],
    pub metadata_hash: Option<[u8; HASH_BYTES]>,
    pub created_at: i64,
    pub bump: u8,
}

impl DocumentRecord {
    pub const SPACE: usize =
        8 + UUID_BYTES + 32 + 32 + 32 + HASH_BYTES + HASH_BYTES + (1 + HASH_BYTES) + 8 + 1;
}

#[account]
pub struct ConsentRecord {
    pub consent_id: [u8; UUID_BYTES],
    pub patient: Pubkey,
    pub doctor: Pubkey,
    pub scope_hash: [u8; HASH_BYTES],
    pub status: ConsentStatus,
    pub expires_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl ConsentRecord {
    pub const SPACE: usize = 8 + UUID_BYTES + 32 + 32 + HASH_BYTES + 1 + (1 + 8) + 8 + 8 + 1;

    pub fn is_active(&self, now: i64) -> bool {
        self.status == ConsentStatus::Approved
            && self.expires_at.map_or(true, |expires_at| expires_at > now)
    }
}

#[account]
pub struct AccessLog {
    pub audit_log_id: [u8; UUID_BYTES],
    pub patient: Pubkey,
    pub doctor: Pubkey,
    pub document: Pubkey,
    pub actor: Pubkey,
    pub action: AuditAction,
    pub status: AuditStatus,
    pub created_at: i64,
    pub bump: u8,
}

impl AccessLog {
    pub const SPACE: usize = 8 + UUID_BYTES + 32 + 32 + 32 + 32 + 1 + 1 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ConsentStatus {
    Pending,
    Approved,
    Rejected,
    Revoked,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum AuditAction {
    RequestAccess,
    Approve,
    Reject,
    Revoke,
    Upload,
    View,
    Download,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum AuditStatus {
    Success,
    Denied,
    Failed,
}

#[error_code]
pub enum ClinexaError {
    #[msg("Patient authority does not match the registered patient account.")]
    UnauthorizedPatient,
    #[msg("Doctor authority does not match the registered doctor account.")]
    UnauthorizedDoctor,
    #[msg("Consent is not active.")]
    ConsentNotActive,
    #[msg("Consent is linked to another patient.")]
    ConsentPatientMismatch,
    #[msg("Consent is linked to another doctor.")]
    ConsentDoctorMismatch,
    #[msg("Consent expiration must be in the future.")]
    InvalidExpiration,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn consent(status: ConsentStatus, expires_at: Option<i64>) -> ConsentRecord {
        ConsentRecord {
            consent_id: [1; UUID_BYTES],
            patient: Pubkey::new_unique(),
            doctor: Pubkey::new_unique(),
            scope_hash: [2; HASH_BYTES],
            status,
            expires_at,
            created_at: 100,
            updated_at: 100,
            bump: 255,
        }
    }

    #[test]
    fn approved_consent_without_expiry_is_active() {
        assert!(consent(ConsentStatus::Approved, None).is_active(100));
    }

    #[test]
    fn approved_consent_with_future_expiry_is_active() {
        assert!(consent(ConsentStatus::Approved, Some(101)).is_active(100));
    }

    #[test]
    fn approved_consent_with_past_expiry_is_inactive() {
        assert!(!consent(ConsentStatus::Approved, Some(100)).is_active(100));
    }

    #[test]
    fn revoked_consent_is_inactive() {
        assert!(!consent(ConsentStatus::Revoked, None).is_active(100));
    }
}
