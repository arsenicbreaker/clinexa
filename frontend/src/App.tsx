import { FormEvent, useEffect, useMemo, useState } from 'react';
import logoImg from '../pictures/Logo1.png';
import {
  Activity,
  AlertCircle,
  Bell,
  BriefcaseMedical,
  CalendarCheck2,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileText,
  HeartPulse,
  Home,
  Hourglass,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Megaphone,
  Network,
  Plus,
  Search,
  ShieldCheck,
  UploadCloud,
  User,
  UserRound,
  Users,
  X,
  XCircle
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { apiRequest, downloadFile, supabase } from './api';

type Role = 'patient' | 'doctor' | 'clinic_admin';
type StaffView = 'dashboard' | 'records' | 'appointments';

type Profile = {
  id: string;
  wallet_address: string | null;
  role: Role;
  display_name: string | null;
};

type Patient = {
  id: string;
  patient_code: string;
  onchain_patient_pda: string | null;
  created_at: string;
};

type Doctor = {
  id: string;
  clinic_id: string | null;
  specialization: string | null;
  onchain_doctor_pda: string | null;
  created_at: string;
};

type Clinic = {
  id: string;
  name: string;
  wallet_address: string | null;
  onchain_clinic_pda: string | null;
  created_at: string;
};

type Consent = {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  scope: string;
  expires_at: string | null;
  onchain_consent_pda?: string | null;
  created_at?: string;
  updated_at?: string;
};

type MedicalDocument = {
  id: string;
  patient_id: string;
  uploaded_by_doctor_id: string;
  clinic_id: string | null;
  document_type: string;
  file_hash: string;
  metadata_hash: string | null;
  onchain_document_pda: string | null;
  created_at: string;
};

type AccessLog = {
  id: string;
  patient_id: string | null;
  doctor_id: string | null;
  document_id: string | null;
  action: string;
  status: string;
  reason: string | null;
  tx_signature: string | null;
  created_at: string;
};

type ApiData<T> = { data: T };
type StoredState = {
  patients: Patient[];
  doctors: Doctor[];
  clinics: Clinic[];
  consents: Consent[];
};

type StatTone = 'teal' | 'violet' | 'amber' | 'green' | 'red' | 'blue';
type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

const emptyStoredState: StoredState = {
  patients: [],
  doctors: [],
  clinics: [],
  consents: []
};

const storageKey = 'clinexa.frontend.state';

const dashboardStats = [
  { label: 'Pasien Aktif', value: '1,284', delta: '+12 bulan ini', icon: Users, tone: 'teal' as StatTone },
  { label: 'Rekam Medis', value: '3,901', delta: '+12 bulan ini', icon: ClipboardList, tone: 'violet' as StatTone },
  { label: 'Janji Hari Ini', value: '24', delta: '+12 bulan ini', icon: CalendarClock, tone: 'amber' as StatTone },
  { label: 'Akses Aktif', value: '1,284', delta: '+12 bulan ini', icon: ShieldCheck, tone: 'green' as StatTone }
];

const activityItems = [
  { title: 'Budi Santoso menyetujui akses rekam medis', time: '5 menit lalu', icon: Check, tone: 'green' as StatTone },
  { title: 'Janji temu Siti Rahayu dikonfirmasi', time: '22 menit lalu', icon: CalendarCheck2, tone: 'amber' as StatTone },
  { title: 'Permintaan akses Ahmad Fauzi menunggu izin', time: '36 menit lalu', icon: Hourglass, tone: 'red' as StatTone }
];

const medicalRecordRows = [
  {
    patient: 'Hendra Wijaya',
    code: 'P-2024-001',
    type: 'Pemeriksaan Jantung',
    clinic: 'RS Harapan Sehat',
    date: '4 Feb 2026',
    wallet: '0x8a2f9cf7s...1e92',
    status: 'Akses Diberikan',
    tone: 'success' as StatusTone
  },
  {
    patient: 'Siti Rahayu',
    code: 'P-2024-002',
    type: 'Tes Laboratorium',
    clinic: 'RS Medika',
    date: '4 Feb 2026',
    wallet: '0x7b3e8daa2f...9c41',
    status: 'Akses Ditolak',
    tone: 'danger' as StatusTone
  },
  {
    patient: 'Ahmad Fauzi',
    code: 'P-2024-003',
    type: 'Resep Obat',
    clinic: 'Puskesmas Wonokromo',
    date: '10 Feb 2026',
    wallet: '0x4c9f1bb3e7...2a18',
    status: 'Menunggu Izin',
    tone: 'warning' as StatusTone
  },
  {
    patient: 'Nina Putri',
    code: 'P-2024-004',
    type: 'Pemeriksaan Rutin',
    clinic: 'RS Siloam Surabaya',
    date: '12 Feb 2026',
    wallet: '0x2d7c5ee1a9...5f33',
    status: 'Menunggu Izin',
    tone: 'warning' as StatusTone
  },
  {
    patient: 'Hendra Wijaya',
    code: 'P-2024-005',
    type: 'Tes Laboratorium',
    clinic: 'RS Harapan Sehat',
    date: '28 Feb 2026',
    wallet: '0x9e1a4cc8d2...7b90',
    status: 'Akses Diberikan',
    tone: 'success' as StatusTone
  }
];

const appointmentRows = [
  {
    patient: 'Hendra Wijaya',
    initials: 'HW',
    code: 'P-2024-001',
    date: '15 Maret 2026',
    time: '10.00 WIB',
    type: 'Konsultasi Umum',
    status: 'Dikonfirmasi',
    tone: 'success' as StatusTone
  },
  {
    patient: 'Dewi Kusuma',
    initials: 'DK',
    code: 'P-2024-006',
    date: '15 Maret 2026',
    time: '11.30 WIB',
    type: 'Pemeriksaan Rutin',
    status: 'Menunggu',
    tone: 'warning' as StatusTone
  },
  {
    patient: 'Dewi Kusuma',
    initials: 'DK',
    code: 'P-2024-006',
    date: '15 Maret 2026',
    time: '11.30 WIB',
    type: 'Pemeriksaan Rutin',
    status: 'Menunggu',
    tone: 'warning' as StatusTone
  },
  {
    patient: 'Dewi Kusuma',
    initials: 'DK',
    code: 'P-2024-006',
    date: '15 Maret 2026',
    time: '11.30 WIB',
    type: 'Pemeriksaan Rutin',
    status: 'Dibatalkan',
    tone: 'danger' as StatusTone
  },
  {
    patient: 'Hendra Wijaya',
    initials: 'HW',
    code: 'P-2024-001',
    date: '15 Maret 2026',
    time: '10.00 WIB',
    type: 'Konsultasi Umum',
    status: 'Dikonfirmasi',
    tone: 'success' as StatusTone
  }
];

function getStoredState(): StoredState {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return emptyStoredState;
  }

  try {
    return { ...emptyStoredState, ...JSON.parse(raw) };
  } catch {
    return emptyStoredState;
  }
}

function saveStoredState(state: StoredState) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function uniqById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function shortId(value?: string | null) {
  if (!value) {
    return '-';
  }
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Terjadi kesalahan';
}

function getTodayLabel() {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());
}
// tempat logo
function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className={`brand-logo ${inverted ? 'brand-logo-inverted' : ''}`} aria-label="Clinexa">
      <img src={logoImg} alt="Clinexa Logo" style={{ height: '50px', objectFit: 'contain' }} />
    </div>
  );
}

function Button({
  children,
  variant = 'primary',
  busy = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; busy?: boolean }) {
  return (
    <button className={`btn btn-${variant}`} disabled={busy || props.disabled} aria-busy={busy} {...props}>
      {busy ? <Loader2 size={18} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

function IconField({
  icon: Icon,
  label,
  id,
  children
}: {
  icon: typeof Mail;
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-shell">
        <Icon size={20} aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return (
    <p className="helper error-text" role="alert">
      {message}
    </p>
  );
}

function Banner({
  tone,
  title,
  children
}: {
  tone: 'error' | 'success' | 'info';
  title: string;
  children: React.ReactNode;
}) {
  const Icon = tone === 'error' ? AlertCircle : tone === 'success' ? CheckCircle2 : ShieldCheck;
  return (
    <div className={`banner banner-${tone}`}>
      <Icon size={18} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="meta">
      <span>{label}</span>
      <span>{value || '-'}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, message }: { icon: typeof FileText; title: string; message: string }) {
  return (
    <div className="empty">
      <Icon size={34} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p className="helper">{message}</p>
      </div>
    </div>
  );
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<StaffView>('dashboard');
  const [stored, setStored] = useState<StoredState>(() => getStoredState());
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = session?.access_token ?? '';

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setProfile(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    saveStoredState(stored);
  }, [stored]);

  useEffect(() => {
    if (!token) {
      return;
    }
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const activePatientId = stored.patients[0]?.id ?? '';
  const activeDoctorId = stored.doctors[0]?.id ?? '';

  async function runAction<T>(action: () => Promise<T>, success?: string) {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const result = await action();
      if (success) {
        setNotice(success);
      }
      return result;
    } catch (actionError) {
      setError(getErrorMessage(actionError));
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function refreshMe() {
    if (!token) {
      return;
    }
    await runAction(async () => {
      const payload = await apiRequest<ApiData<{ profile: Profile | null }>>('/me', { token });
      setProfile(payload.data.profile);
    });
  }

  function remember<K extends keyof StoredState>(key: K, item: StoredState[K][number]) {
    setStored((current) => ({
      ...current,
      [key]: uniqById([item, ...current[key]]) as StoredState[K]
    }));
  }

  async function loadPatientData(patientId: string) {
    if (!patientId) {
      setError('Masukkan atau buat Patient ID terlebih dahulu.');
      return;
    }

    await runAction(async () => {
      const [documentPayload, logPayload] = await Promise.all([
        apiRequest<ApiData<MedicalDocument[]>>(`/patients/${patientId}/documents`, { token }),
        apiRequest<ApiData<AccessLog[]>>(`/patients/${patientId}/access-logs`, { token })
      ]);
      setDocuments(documentPayload.data);
      setLogs(logPayload.data);
    }, 'Data pasien diperbarui.');
  }

  if (!session) {
    return <AuthPortal loading={loading} runAction={runAction} />;
  }

  return (
    <div className="staff-shell">
      <Sidebar view={view} setView={setView} profile={profile} session={session} />
      <main className="staff-main">
        <div className="mobile-brand">
          <Logo />
          <button className="icon-btn" type="button" aria-label="Keluar" onClick={() => supabase.auth.signOut()}>
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="notice-stack">
          {error ? (
            <Banner tone="error" title="Aksi gagal">
              {error}
            </Banner>
          ) : null}
          {notice ? (
            <Banner tone="success" title="Berhasil">
              {notice}
            </Banner>
          ) : null}
        </div>

        {view === 'dashboard' ? (
          <DashboardPage
            profile={profile}
            token={token}
            stored={stored}
            loading={loading}
            setStored={setStored}
            runAction={runAction}
            remember={remember}
            onLinked={refreshMe}
          />
        ) : null}
        {view === 'records' ? (
          <RecordsPage
            token={token}
            loading={loading}
            stored={stored}
            documents={documents}
            logs={logs}
            runAction={runAction}
            remember={remember}
            loadPatientData={loadPatientData}
            activePatientId={activePatientId}
            activeDoctorId={activeDoctorId}
          />
        ) : null}
        {view === 'appointments' ? <AppointmentsPage /> : null}
      </main>
    </div>
  );
}

function AuthPortal({
  loading,
  runAction
}: {
  loading: boolean;
  runAction: <T>(action: () => Promise<T>, success?: string) => Promise<T | null>;
}) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [registrationId, setRegistrationId] = useState('');
  const [institution, setInstitution] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [nationality, setNationality] = useState('');
  const [address, setAddress] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    await runAction(async () => {
      const result =
        mode === 'signin'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
                specialization,
                registration_id: registrationId,
                institution
              }
            }
          });
      if (result.error) {
        throw result.error;
      }
    }, mode === 'signin' ? 'Masuk berhasil.' : 'Akun dibuat. Konfirmasi email jika diminta Supabase.');
  }

  return (
    <main className="auth-layout">
      <section className="auth-hero" aria-label="Portal staf medis Clinexa">
        <Logo inverted />
        <div className="auth-hero-copy">
          <h1>PORTAL STAF MEDIS</h1>
          <p>Kelola rekam medis, janji temu, dan layanan kesehatan secara digital dan terdesentralisasi.</p>
        </div>
        <div className="auth-metrics" aria-label="Ringkasan portal">
          <MetricCard value="1,284" label="Pasien Aktif" />
          <MetricCard value="3,901" label="Rekam Medis" />
          <MetricCard value="24" label="Janji Hari Ini" />
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <form className="auth-form" onSubmit={submit}>
          <div>
            <h2 id="auth-title">{mode === 'signin' ? 'Selamat Datang' : 'Registrasi Staf Medis'}</h2>
            <p>{mode === 'signin' ? 'Masuk ke akun staf medis Anda' : 'Lengkapi data diri untuk mendaftar sebagai staf medis di jaringan Clinexa'}</p>
          </div>

          {mode === 'signup' ? (
            <div className="auth-grid">
              <IconField icon={User} label="Nama Lengkap" id="full-name">
                <input
                  id="full-name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Dr. Agung Setya"
                  required
                />
              </IconField>
              <IconField icon={HeartPulse} label="Golongan Darah" id="blood-type">
                <input id="blood-type" value={bloodType} onChange={(event) => setBloodType(event.target.value)} placeholder="B+" />
              </IconField>
            </div>
          ) : null}

          <div className={mode === 'signup' ? 'auth-grid' : 'auth-single'}>
            <IconField icon={Mail} label="Email" id="email">
              <input
                id="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="yourname@domain"
                required
              />
            </IconField>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-shell">
                <KeyRound size={20} aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="**********"
                  required
                />
                <button
                  className="field-icon-btn"
                  type="button"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                </button>
              </div>
              <FieldError message={password && password.length < 6 ? 'Gunakan minimal 6 karakter.' : undefined} />
            </div>
          </div>

          {mode === 'signup' ? (
            <>
              <div className="auth-grid">
                <IconField icon={BriefcaseMedical} label="Jabatan/Spesialisasi" id="specialization">
                  <input
                    id="specialization"
                    value={specialization}
                    onChange={(event) => setSpecialization(event.target.value)}
                    placeholder="Dokter Umum"
                  />
                </IconField>
                <IconField icon={Network} label="Kewarganegaraan" id="nationality">
                  <input
                    id="nationality"
                    value={nationality}
                    onChange={(event) => setNationality(event.target.value)}
                    placeholder="WNI (Warga Negara Indonesia)"
                  />
                </IconField>
              </div>
              <div className="auth-grid">
                <IconField icon={ClipboardList} label="NIP/No. Registrasi" id="registration-id">
                  <input
                    id="registration-id"
                    spellCheck={false}
                    value={registrationId}
                    onChange={(event) => setRegistrationId(event.target.value)}
                    placeholder="19860102010011001"
                  />
                </IconField>
                <IconField icon={Home} label="Institusi" id="institution">
                  <input
                    id="institution"
                    autoComplete="organization"
                    value={institution}
                    onChange={(event) => setInstitution(event.target.value)}
                    placeholder="RS Semen Gresik"
                  />
                </IconField>
              </div>
              <IconField icon={MapPin} label="Alamat Lengkap" id="address">
                <input
                  id="address"
                  autoComplete="street-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Jl Kartini, Kebomas, Gresik"
                />
              </IconField>
            </>
          ) : (
            <button className="link-button forgot-link" type="button">
              Lupa Password?
            </button>
          )}

          <Button type="submit" busy={loading}>
            {mode === 'signin' ? 'Masuk' : 'Daftar'}
          </Button>

          <p className="auth-switch">
            {mode === 'signin' ? 'Belum punya akun staf?' : 'Sudah memiliki akun?'}{' '}
            <button type="button" className="link-button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Daftar' : 'Masuk'}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="auth-metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Sidebar({
  view,
  setView,
  profile,
  session
}: {
  view: StaffView;
  setView: (view: StaffView) => void;
  profile: Profile | null;
  session: Session;
}) {
  const displayName = profile?.display_name || session.user.user_metadata?.full_name || 'Dr. Agung Setya';
  const navItems = [
    { id: 'dashboard' as StaffView, label: 'Dashboard', icon: Home },
    { id: 'records' as StaffView, label: 'Rekam Medis', icon: ClipboardList },
    { id: 'appointments' as StaffView, label: 'Janji Temu', icon: CalendarCheck2 }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Logo />
        <div className="staff-card">
          <div className="avatar">AS</div>
          <div>
            <strong>{displayName}</strong>
            <span>Dokter Umum</span>
          </div>
        </div>
      </div>

      <nav className="side-nav" aria-label="Navigasi staf medis">
        {navItems.map((item) => (
          <button key={item.id} type="button" className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}>
            <item.icon size={22} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
        <button type="button" className="nav-item muted-nav" disabled>
          <Megaphone size={22} aria-hidden="true" />
          <span>Pengumuman</span>
        </button>
        <button type="button" className="nav-item muted-nav" disabled>
          <Bell size={22} aria-hidden="true" />
          <span>Notifikasi</span>
        </button>
        <button type="button" className="nav-item muted-nav" disabled>
          <UserRound size={22} aria-hidden="true" />
          <span>Profil</span>
        </button>
      </nav>

      <button className="sidebar-signout" type="button" onClick={() => supabase.auth.signOut()}>
        <LogOut size={18} aria-hidden="true" />
        Keluar
      </button>
    </aside>
  );
}

function DashboardPage(props: {
  profile: Profile | null;
  token: string;
  stored: StoredState;
  loading: boolean;
  setStored: React.Dispatch<React.SetStateAction<StoredState>>;
  runAction: <T>(action: () => Promise<T>, success?: string) => Promise<T | null>;
  remember: <K extends keyof StoredState>(key: K, item: StoredState[K][number]) => void;
  onLinked: () => Promise<void>;
}) {
  return (
    <div className="page-stack">
      <PageHeader title="Dashboard" subtitle={getTodayLabel()} />
      <div className="stat-grid">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {!props.profile ? (
        <ProfileSetupCard
          token={props.token}
          loading={props.loading}
          runAction={props.runAction}
          onLinked={props.onLinked}
        />
      ) : null}

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-title">
            <h2>Kunjungan Pasien</h2>
            <p>Pasien Aktif</p>
          </div>
          <VisitChart />
        </section>
        <section className="panel donut-panel">
          <div className="panel-title">
            <h2>Jenis Rekam Medis</h2>
            <p>Distribusi Bulan Ini</p>
          </div>
          <DonutChart />
        </section>
      </div>

      <div className="dashboard-grid lower">
        <section className="panel">
          <div className="panel-title">
            <h2>Aktivitas Terkini</h2>
          </div>
          <div className="activity-list">
            {activityItems.map((item) => (
              <div className="activity-row" key={item.title}>
                <span className={`mini-icon tone-${item.tone}`}>
                  <item.icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>
                    <Clock3 size={14} aria-hidden="true" />
                    {item.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <LocalRegistry stored={props.stored} setStored={props.setStored} />
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action ? <div className="page-action">{action}</div> : null}
    </header>
  );
}

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone
}: {
  label: string;
  value: string;
  delta?: string;
  icon: typeof Users;
  tone: StatTone;
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon tone-${tone}`}>
        <Icon size={24} aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      <span>{label}</span>
      {delta ? <p className={`delta tone-text-${tone}`}>{delta}</p> : null}
    </article>
  );
}

function ProfileSetupCard({
  token,
  loading,
  runAction,
  onLinked
}: {
  token: string;
  loading: boolean;
  runAction: <T>(action: () => Promise<T>, success?: string) => Promise<T | null>;
  onLinked: () => Promise<void>;
}) {
  const [walletAddress, setWalletAddress] = useState('');
  const [displayName, setDisplayName] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    await runAction(async () => {
      await apiRequest<ApiData<Profile>>('/auth/link-wallet', {
        method: 'POST',
        token,
        body: { role: 'doctor', walletAddress, displayName: displayName || undefined }
      });
      await onLinked();
    }, 'Profil staf medis terhubung.');
  }

  return (
    <section className="panel setup-panel">
      <div className="panel-title">
        <h2>Hubungkan Profil Staf Medis</h2>
        <p>Backend memakai profil role doctor untuk akses endpoint rekam medis.</p>
      </div>
      <form className="inline-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="wallet">Wallet address</label>
          <input id="wallet" value={walletAddress} onChange={(event) => setWalletAddress(event.target.value)} minLength={32} required />
        </div>
        <div className="field">
          <label htmlFor="display-name">Nama tampilan</label>
          <input id="display-name" autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </div>
        <Button type="submit" busy={loading}>
          Hubungkan
        </Button>
      </form>
    </section>
  );
}

function VisitChart() {
  return (
    <div className="visit-chart" aria-label="Grafik kunjungan pasien">
      <div className="y-axis">
        <span>400</span>
        <span>360</span>
        <span>320</span>
        <span>280</span>
        <span>240</span>
        <span>200</span>
      </div>
      <div className="chart-area">
        <svg viewBox="0 0 760 260" role="img" aria-label="Kunjungan pasien naik turun sepanjang tahun">
          <defs>
            <linearGradient id="visitGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8b75ff" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#8b75ff" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          <path d="M18 234 C64 142 88 124 116 138 C150 154 166 220 206 184 C238 154 246 92 292 104 C334 116 344 166 386 142 C424 120 430 12 476 48 C524 86 484 176 544 198 C612 222 630 96 684 74 C724 58 726 140 742 118" fill="none" stroke="#8b75ff" strokeWidth="3" />
          <path d="M18 234 C64 142 88 124 116 138 C150 154 166 220 206 184 C238 154 246 92 292 104 C334 116 344 166 386 142 C424 120 430 12 476 48 C524 86 484 176 544 198 C612 222 630 96 684 74 C724 58 726 140 742 118 L742 260 L18 260 Z" fill="url(#visitGradient)" />
          {[18, 116, 206, 292, 386, 476, 544, 684, 742].map((cx, index) => (
            <circle key={cx} cx={cx} cy={[234, 138, 184, 104, 142, 48, 198, 74, 118][index]} r="4" fill="#fff" stroke="#8b75ff" strokeWidth="2" />
          ))}
        </svg>
        <div className="months">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
            <span key={month}>{month}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DonutChart() {
  return (
    <div className="donut-wrap">
      <div className="donut" aria-label="Distribusi rekam medis: pemeriksaan 42 persen, lab 28 persen, resep 18 persen, lainnya 12 persen">
        <span>100</span>
      </div>
      <div className="legend">
        <span>
          <i className="legend-violet" /> Pemeriksaan
        </span>
        <span>
          <i className="legend-green" /> Lab
        </span>
        <span>
          <i className="legend-teal" /> Resep
        </span>
        <span>
          <i className="legend-amber" /> Lainnya
        </span>
      </div>
    </div>
  );
}

function LocalRegistry({ stored, setStored }: { stored: StoredState; setStored: React.Dispatch<React.SetStateAction<StoredState>> }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Menunggu Konfirmasi</h2>
        <p>ID lokal untuk pengujian MVP.</p>
      </div>
      <div className="registry-list">
        <MetaRow label="Patient" value={shortId(stored.patients[0]?.id)} />
        <MetaRow label="Doctor" value={shortId(stored.doctors[0]?.id)} />
        <MetaRow label="Consent" value={shortId(stored.consents[0]?.id)} />
      </div>
      <Button type="button" variant="secondary" onClick={() => setStored(emptyStoredState)}>
        Clear IDs
      </Button>
    </section>
  );
}

function RecordsPage(props: {
  token: string;
  loading: boolean;
  stored: StoredState;
  documents: MedicalDocument[];
  logs: AccessLog[];
  activePatientId: string;
  activeDoctorId: string;
  runAction: <T>(action: () => Promise<T>, success?: string) => Promise<T | null>;
  remember: <K extends keyof StoredState>(key: K, item: StoredState[K][number]) => void;
  loadPatientData: (patientId: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState('Semua');
  const [query, setQuery] = useState('');

  const filteredRows = medicalRecordRows.filter((row) => {
    const matchesFilter = filter === 'Semua' || row.type.includes(filter);
    const matchesQuery = `${row.patient} ${row.code} ${row.type}`.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="page-stack">
      <PageHeader
        title="Rekam Medis"
        subtitle="6 rekam medis terdaftar"
        action={
          <Button type="button" onClick={() => window.document.getElementById('upload-panel')?.scrollIntoView({ behavior: 'smooth' })}>
            <UploadCloud size={20} aria-hidden="true" />
            Upload Rekam Medis
          </Button>
        }
      />

      <div className="stat-grid records-stats">
        <StatCard label="Akses Diberikan" value="3" icon={Check} tone="green" />
        <StatCard label="Menunggu Izin" value="12" icon={Hourglass} tone="amber" />
        <StatCard label="Akses Ditolak" value="1" icon={X} tone="red" />
      </div>

      <section className="panel filter-panel">
        <div className="segmented" role="group" aria-label="Filter rekam medis">
          {['Semua', 'Pemeriksaan', 'Lab', 'Resep'].map((item) => (
            <button key={item} type="button" className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
        <label className="search-field" htmlFor="record-search">
          <Search size={22} aria-hidden="true" />
          <input
            id="record-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari pasien atau rekam medis..."
          />
        </label>
      </section>

      <section className="record-list" aria-label="Daftar rekam medis">
        {filteredRows.length === 0 ? (
          <EmptyState icon={FileText} title="Rekam medis tidak ditemukan" message="Ubah kata kunci atau filter kategori." />
        ) : (
          filteredRows.map((record) => <MedicalRecordRow key={`${record.code}-${record.date}`} record={record} />)
        )}
      </section>

      <StaffActionPanel {...props} />
    </div>
  );
}

function MedicalRecordRow({ record }: { record: (typeof medicalRecordRows)[number] }) {
  return (
    <article className="data-row">
      <div className="row-main">
        <span className="row-icon">
          <FileText size={24} aria-hidden="true" />
        </span>
        <div>
          <strong>
            {record.patient} <span>{record.code}</span>
          </strong>
          <p>
            {record.type} · {record.clinic} · {record.date}
          </p>
          <small>
            <ShieldCheck size={15} aria-hidden="true" />
            {record.wallet}
          </small>
        </div>
      </div>
      <div className="row-actions">
        <StatusPill tone={record.tone}>{record.status}</StatusPill>
        {record.tone === 'success' ? (
          <button className="view-btn" type="button">
            <Eye size={18} aria-hidden="true" />
            Lihat
          </button>
        ) : null}
      </div>
    </article>
  );
}

function StaffActionPanel(props: {
  token: string;
  loading: boolean;
  stored: StoredState;
  documents: MedicalDocument[];
  logs: AccessLog[];
  activePatientId: string;
  activeDoctorId: string;
  runAction: <T>(action: () => Promise<T>, success?: string) => Promise<T | null>;
  remember: <K extends keyof StoredState>(key: K, item: StoredState[K][number]) => void;
  loadPatientData: (patientId: string) => Promise<void>;
}) {
  const [clinicId, setClinicId] = useState(props.stored.clinics[0]?.id ?? '');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialization, setSpecialization] = useState('Dokter Umum');
  const [patientId, setPatientId] = useState(props.activePatientId);
  const [doctorId, setDoctorId] = useState(props.activeDoctorId);
  const [scope, setScope] = useState('documents:read');
  const [documentType, setDocumentType] = useState('clinical-note');
  const [metadata, setMetadata] = useState('{"source":"clinexa-frontend"}');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => setPatientId(props.activePatientId), [props.activePatientId]);
  useEffect(() => setDoctorId(props.activeDoctorId), [props.activeDoctorId]);

  async function createDoctor(event: FormEvent) {
    event.preventDefault();
    await props.runAction(async () => {
      const payload = await apiRequest<ApiData<Doctor>>('/doctors', {
        method: 'POST',
        token: props.token,
        body: { clinicId: clinicId || undefined, licenseNumber: licenseNumber || undefined, specialization: specialization || undefined }
      });
      props.remember('doctors', payload.data);
      setDoctorId(payload.data.id);
    }, 'Identitas dokter dibuat.');
  }

  async function requestConsent(event: FormEvent) {
    event.preventDefault();
    await props.runAction(async () => {
      const payload = await apiRequest<ApiData<Consent>>('/consents/request', {
        method: 'POST',
        token: props.token,
        body: { patientId, doctorId, clinicId: clinicId || undefined, scope }
      });
      props.remember('consents', payload.data);
    }, 'Permintaan akses dibuat.');
  }

  async function uploadDocument(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      throw new Error('Pilih file terlebih dahulu.');
    }

    await props.runAction(async () => {
      const body = new FormData();
      body.set('file', file);
      body.set('patientId', patientId);
      body.set('doctorId', doctorId);
      body.set('documentType', documentType);
      if (clinicId) {
        body.set('clinicId', clinicId);
      }
      if (metadata) {
        body.set('metadata', metadata);
      }
      await apiRequest<ApiData<MedicalDocument>>('/documents', { method: 'POST', token: props.token, body });
    }, 'Dokumen terenkripsi dan dicatat on-chain.');
  }

  return (
    <section id="upload-panel" className="panel action-panel">
      <div className="panel-title">
        <h2>Aksi Rekam Medis On-chain</h2>
        <p>Buat identitas dokter, minta consent pasien, lalu upload file medis terenkripsi.</p>
      </div>

      <div className="action-grid">
        <form className="form-card" onSubmit={createDoctor}>
          <h3>Identitas Dokter</h3>
          <div className="field">
            <label htmlFor="doctor-clinic">Clinic ID</label>
            <input id="doctor-clinic" value={clinicId} onChange={(event) => setClinicId(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="license">Nomor lisensi</label>
            <input id="license" value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} spellCheck={false} />
          </div>
          <div className="field">
            <label htmlFor="specialization">Spesialisasi</label>
            <input id="specialization" value={specialization} onChange={(event) => setSpecialization(event.target.value)} />
          </div>
          <Button type="submit" busy={props.loading}>
            Buat Dokter
          </Button>
        </form>

        <form className="form-card" onSubmit={requestConsent}>
          <h3>Request Consent</h3>
          <div className="field">
            <label htmlFor="request-patient">Patient ID</label>
            <input id="request-patient" value={patientId} onChange={(event) => setPatientId(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="request-doctor">Doctor ID</label>
            <input id="request-doctor" value={doctorId} onChange={(event) => setDoctorId(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="scope">Scope</label>
            <input id="scope" value={scope} onChange={(event) => setScope(event.target.value)} required />
          </div>
          <Button type="submit" busy={props.loading}>
            Minta Akses
          </Button>
        </form>

        <form className="form-card wide-form" onSubmit={uploadDocument}>
          <h3>Upload Rekam Medis</h3>
          <div className="form-columns">
            <div className="field">
              <label htmlFor="upload-patient">Patient ID</label>
              <input id="upload-patient" value={patientId} onChange={(event) => setPatientId(event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="upload-doctor">Doctor ID</label>
              <input id="upload-doctor" value={doctorId} onChange={(event) => setDoctorId(event.target.value)} required />
            </div>
          </div>
          <div className="form-columns">
            <div className="field">
              <label htmlFor="document-type">Tipe dokumen</label>
              <input id="document-type" value={documentType} onChange={(event) => setDocumentType(event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="medical-file">File medis</label>
              <input id="medical-file" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="metadata">Metadata JSON</label>
            <textarea id="metadata" value={metadata} onChange={(event) => setMetadata(event.target.value)} spellCheck={false} />
          </div>
          <Button type="submit" busy={props.loading}>
            Upload File
          </Button>
        </form>
      </div>

      <RecordList title="Dokumen API" records={props.documents} type="documents" token={props.token} />
      <RecordList title="Audit Log API" records={props.logs} type="logs" token={props.token} />
    </section>
  );
}

function AppointmentsPage() {
  const [filter, setFilter] = useState('Semua');
  const [query, setQuery] = useState('');
  const filteredRows = appointmentRows.filter((row) => {
    const matchesFilter = filter === 'Semua' || row.status === filter || (filter === 'Menunggu Konfirmasi' && row.status === 'Menunggu');
    const matchesQuery = `${row.patient} ${row.code} ${row.type}`.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="page-stack">
      <PageHeader title="Janji Temu" subtitle="Kelola dan konfirmasi jadwal pasien" />

      <div className="stat-grid">
        <StatCard label="Dikonfirmasi" value="1" icon={Check} tone="green" />
        <StatCard label="Menunggu Konfirmasi" value="3" icon={Hourglass} tone="amber" />
        <StatCard label="Dibatalkan" value="0" icon={X} tone="red" />
        <StatCard label="Selesai" value="1" icon={CheckCircle2} tone="blue" />
      </div>

      <section className="panel filter-panel">
        <div className="segmented appointments-filter" role="group" aria-label="Filter janji temu">
          {['Semua', 'Dikonfirmasi', 'Menunggu Konfirmasi', 'Dibatalkan', 'Selesai'].map((item) => (
            <button key={item} type="button" className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
        <label className="search-field" htmlFor="appointment-search">
          <Search size={22} aria-hidden="true" />
          <input
            id="appointment-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari pasien atau jenis kunjungan..."
          />
        </label>
      </section>

      <section className="record-list" aria-label="Daftar janji temu">
        {filteredRows.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Janji temu tidak ditemukan" message="Ubah kata kunci atau filter status." />
        ) : (
          filteredRows.map((appointment, index) => <AppointmentRow key={`${appointment.patient}-${index}`} appointment={appointment} />)
        )}
      </section>
    </div>
  );
}

function AppointmentRow({ appointment }: { appointment: (typeof appointmentRows)[number] }) {
  return (
    <article className="data-row">
      <div className="row-main appointment-main">
        <span className="avatar row-avatar">{appointment.initials}</span>
        <div>
          <strong>
            {appointment.patient} <span>{appointment.code}</span>
          </strong>
          <p>
            <CalendarClock size={17} aria-hidden="true" />
            {appointment.date}
            <Clock3 size={17} aria-hidden="true" />
            {appointment.time}
            <Network size={17} aria-hidden="true" />
            {appointment.type}
          </p>
        </div>
      </div>
      <div className="row-actions">
        <StatusPill tone={appointment.tone}>{appointment.status}</StatusPill>
        <button className="view-btn" type="button">
          <Eye size={18} aria-hidden="true" />
          Lihat
        </button>
      </div>
    </article>
  );
}

function StatusPill({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  const Icon = tone === 'success' ? Check : tone === 'danger' ? XCircle : tone === 'warning' ? Hourglass : Activity;
  return (
    <span className={`status-pill status-${tone}`}>
      <Icon size={16} aria-hidden="true" />
      {children}
    </span>
  );
}

function RecordList({
  title,
  records,
  type,
  token
}: {
  title: string;
  records: MedicalDocument[] | AccessLog[];
  type: 'documents' | 'logs';
  token: string;
}) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const sorted = useMemo(
    () => [...records].sort((a, b) => String((b as { created_at?: string }).created_at).localeCompare(String((a as { created_at?: string }).created_at))),
    [records]
  );

  async function download(document: MedicalDocument) {
    setDownloading(document.id);
    try {
      const blob = await downloadFile(`/documents/${document.id}/download`, token);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = `${document.id}-${document.document_type}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="api-records">
      <div className="panel-title">
        <h2>{title}</h2>
        <p>
          {records.length} record{records.length === 1 ? '' : 's'}
        </p>
      </div>
      {records.length === 0 ? (
        <EmptyState
          icon={type === 'documents' ? FileText : Activity}
          title={type === 'documents' ? 'Belum ada dokumen dari API' : 'Belum ada audit log dari API'}
          message="Gunakan patient ID aktif, lalu load data setelah consent dan upload selesai."
        />
      ) : (
        <div className="list">
          {sorted.map((record) =>
            type === 'documents' ? (
              <DocumentItem key={record.id} document={record as MedicalDocument} downloading={downloading === record.id} onDownload={download} />
            ) : (
              <AuditItem key={record.id} log={record as AccessLog} />
            )
          )}
        </div>
      )}
    </div>
  );
}

function DocumentItem({
  document,
  downloading,
  onDownload
}: {
  document: MedicalDocument;
  downloading: boolean;
  onDownload: (document: MedicalDocument) => void;
}) {
  return (
    <article className="item">
      <div className="item-head">
        <p className="item-title">{document.document_type}</p>
        <button className="icon-btn" type="button" aria-label="Download document" onClick={() => onDownload(document)} disabled={downloading}>
          {downloading ? <Loader2 size={18} aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
        </button>
      </div>
      <div className="meta-grid">
        <MetaRow label="Document ID" value={shortId(document.id)} />
        <MetaRow label="File hash" value={shortId(document.file_hash)} />
        <MetaRow label="On-chain PDA" value={shortId(document.onchain_document_pda)} />
      </div>
    </article>
  );
}

function AuditItem({ log }: { log: AccessLog }) {
  return (
    <article className="item">
      <div className="item-head">
        <p className="item-title">{log.action}</p>
        <StatusPill tone={log.status === 'success' ? 'success' : 'warning'}>{log.status}</StatusPill>
      </div>
      <div className="meta-grid">
        <MetaRow label="Log ID" value={shortId(log.id)} />
        <MetaRow label="Document" value={shortId(log.document_id)} />
        <MetaRow label="Tx signature" value={shortId(log.tx_signature)} />
        {log.reason ? <MetaRow label="Reason" value={log.reason} /> : null}
      </div>
    </article>
  );
}
