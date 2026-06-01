import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase.js';
import { requireRole } from '../../middleware/auth.middleware.js';
import { sendCreated } from '../../utils/http.js';
const router = Router();
const createClinicSchema = z.object({
    name: z.string().min(2).max(160),
    walletAddress: z.string().min(32).optional()
});
router.post('/clinics', async (req, res, next) => {
    try {
        requireRole(req, ['clinic_admin']);
        const authed = req;
        const body = createClinicSchema.parse(req.body);
        const { data, error } = await supabaseAdmin
            .from('clinics')
            .insert({
            name: body.name,
            wallet_address: body.walletAddress ?? null,
            created_by: authed.user.id
        })
            .select('id,name,wallet_address,onchain_clinic_pda,created_at')
            .single();
        if (error) {
            throw error;
        }
        return sendCreated(res, data);
    }
    catch (error) {
        next(error);
    }
});
export { router as clinicRoutes };
