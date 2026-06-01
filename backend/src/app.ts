import cors from 'cors';
import express from 'express';
import { authRoutes } from './modules/auth/auth.routes.js';
import { patientRoutes } from './modules/patients/patient.routes.js';
import { clinicRoutes } from './modules/clinics/clinic.routes.js';
import { doctorRoutes } from './modules/doctors/doctor.routes.js';
import { documentRoutes } from './modules/documents/document.routes.js';
import { consentRoutes } from './modules/consent/consent.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(requireAuth);
  app.use(authRoutes);
  app.use(patientRoutes);
  app.use(clinicRoutes);
  app.use(doctorRoutes);
  app.use(documentRoutes);
  app.use(consentRoutes);
  app.use(auditRoutes);

  app.use(errorMiddleware);

  return app;
}
