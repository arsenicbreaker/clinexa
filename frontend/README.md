# Clinexa Frontend

React + Vite MVP console for testing the Clinexa backend flow.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Required frontend env:

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The frontend uses Supabase Auth to get a bearer token, then calls the backend API with that token.

## MVP Flow

1. Sign up or sign in.
2. Link a profile role: patient, doctor, or clinic admin.
3. Create patient, doctor, or clinic registry records.
4. Request consent as a doctor.
5. Sign in as the patient and approve consent.
6. Sign in as the doctor and upload an encrypted document.
7. Sign in as the patient and refresh documents/audit logs.
