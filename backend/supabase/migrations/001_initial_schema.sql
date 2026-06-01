create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  wallet_address text unique,
  role text not null check (role in ('patient', 'doctor', 'clinic_admin')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  wallet_address text unique,
  onchain_clinic_pda text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  patient_code text not null unique,
  encrypted_demographics jsonb,
  onchain_patient_pda text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  license_number_hash text,
  specialization text,
  onchain_doctor_pda text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.medical_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  uploaded_by_doctor_id uuid references public.doctors(id) on delete set null,
  clinic_id uuid references public.clinics(id) on delete set null,
  document_type text not null,
  encrypted_title jsonb,
  encrypted_metadata jsonb,
  storage_bucket text not null default 'medical-records-encrypted',
  storage_path text not null unique,
  file_hash text not null,
  metadata_hash text,
  encryption_key_ref text not null default 'app-master-key',
  onchain_document_pda text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consent_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'revoked', 'expired')),
  scope text not null default 'documents:read',
  expires_at timestamptz,
  onchain_consent_pda text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.access_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  doctor_id uuid references public.doctors(id) on delete set null,
  document_id uuid references public.medical_documents(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('request_access', 'approve', 'reject', 'revoke', 'upload', 'view', 'download')),
  status text not null check (status in ('success', 'denied', 'failed')),
  reason text,
  tx_signature text,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('medical-records-encrypted', 'medical-records-encrypted', false)
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_clinics_updated_at before update on public.clinics
  for each row execute function public.set_updated_at();
create trigger set_patients_updated_at before update on public.patients
  for each row execute function public.set_updated_at();
create trigger set_doctors_updated_at before update on public.doctors
  for each row execute function public.set_updated_at();
create trigger set_medical_documents_updated_at before update on public.medical_documents
  for each row execute function public.set_updated_at();
create trigger set_consent_requests_updated_at before update on public.consent_requests
  for each row execute function public.set_updated_at();

create or replace function public.has_active_consent(p_patient_id uuid, p_doctor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.consent_requests c
    where c.patient_id = p_patient_id
      and c.doctor_id = p_doctor_id
      and c.status = 'approved'
      and (c.expires_at is null or c.expires_at > now())
  );
$$;

create index idx_patients_profile_id on public.patients(profile_id);
create index idx_doctors_profile_id on public.doctors(profile_id);
create index idx_doctors_clinic_id on public.doctors(clinic_id);
create index idx_documents_patient_id on public.medical_documents(patient_id);
create index idx_documents_uploaded_by on public.medical_documents(uploaded_by_doctor_id);
create index idx_consents_patient_doctor on public.consent_requests(patient_id, doctor_id, status);
create index idx_access_logs_patient_id on public.access_logs(patient_id);
create index idx_access_logs_doctor_id on public.access_logs(doctor_id);

alter table public.profiles enable row level security;
alter table public.clinics enable row level security;
alter table public.patients enable row level security;
alter table public.doctors enable row level security;
alter table public.medical_documents enable row level security;
alter table public.consent_requests enable row level security;
alter table public.access_logs enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "clinics_select_authenticated" on public.clinics
  for select to authenticated using (true);
create policy "clinics_insert_admin" on public.clinics
  for insert to authenticated with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'clinic_admin'
    )
  );

create policy "patients_select_own_or_consented_doctor" on public.patients
  for select to authenticated using (
    profile_id = auth.uid()
    or exists (
      select 1
      from public.doctors d
      where d.profile_id = auth.uid()
        and public.has_active_consent(patients.id, d.id)
    )
  );
create policy "patients_insert_own" on public.patients
  for insert to authenticated with check (profile_id = auth.uid());
create policy "patients_update_own" on public.patients
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "doctors_select_authenticated" on public.doctors
  for select to authenticated using (true);
create policy "doctors_insert_own" on public.doctors
  for insert to authenticated with check (profile_id = auth.uid());
create policy "doctors_update_own" on public.doctors
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "documents_select_patient_or_consented_doctor" on public.medical_documents
  for select to authenticated using (
    exists (
      select 1 from public.patients p
      where p.id = medical_documents.patient_id and p.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.doctors d
      where d.profile_id = auth.uid()
        and public.has_active_consent(medical_documents.patient_id, d.id)
      )
  );

revoke select on public.medical_documents from anon, authenticated;
grant select (
  id,
  patient_id,
  uploaded_by_doctor_id,
  clinic_id,
  document_type,
  encrypted_title,
  encrypted_metadata,
  file_hash,
  metadata_hash,
  encryption_key_ref,
  onchain_document_pda,
  created_at,
  updated_at
) on public.medical_documents to authenticated;

create policy "documents_insert_consented_doctor" on public.medical_documents
  for insert to authenticated with check (
    exists (
      select 1 from public.doctors d
      where d.id = uploaded_by_doctor_id
        and d.profile_id = auth.uid()
        and public.has_active_consent(patient_id, d.id)
    )
  );

create policy "consents_select_patient_or_doctor" on public.consent_requests
  for select to authenticated using (
    exists (
      select 1 from public.patients p
      where p.id = consent_requests.patient_id and p.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.doctors d
      where d.id = consent_requests.doctor_id and d.profile_id = auth.uid()
    )
  );
create policy "consents_insert_doctor" on public.consent_requests
  for insert to authenticated with check (
    exists (
      select 1 from public.doctors d
      where d.id = doctor_id and d.profile_id = auth.uid()
    )
  );
create policy "consents_update_patient" on public.consent_requests
  for update to authenticated using (
    exists (
      select 1 from public.patients p
      where p.id = consent_requests.patient_id and p.profile_id = auth.uid()
    )
  );

create policy "access_logs_select_patient_or_doctor" on public.access_logs
  for select to authenticated using (
    actor_profile_id = auth.uid()
    or exists (
      select 1 from public.patients p
      where p.id = access_logs.patient_id and p.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.doctors d
      where d.id = access_logs.doctor_id and d.profile_id = auth.uid()
    )
  );

create policy "storage_no_direct_client_select" on storage.objects
  for select to authenticated using (false);
create policy "storage_no_direct_client_insert" on storage.objects
  for insert to authenticated with check (false);
create policy "storage_no_direct_client_update" on storage.objects
  for update to authenticated using (false);
create policy "storage_no_direct_client_delete" on storage.objects
  for delete to authenticated using (false);
