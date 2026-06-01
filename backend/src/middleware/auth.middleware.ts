import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin, supabaseAuth } from '../config/supabase.js';
import { HttpError } from '../utils/http.js';

export type ProfileRole = 'patient' | 'doctor' | 'clinic_admin';

export type AuthProfile = {
  id: string;
  wallet_address: string | null;
  role: ProfileRole;
  display_name: string | null;
};

export type AuthedRequest = Request & {
  user: { id: string; email?: string };
  profile: AuthProfile | null;
};

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      throw new HttpError(401, 'Missing bearer token');
    }

    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data.user) {
      throw new HttpError(401, 'Invalid bearer token');
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id,wallet_address,role,display_name')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const authed = req as AuthedRequest;
    authed.user = { id: data.user.id, email: data.user.email };
    authed.profile = profile as AuthProfile | null;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireProfile(req: Request) {
  const authed = req as AuthedRequest;
  if (!authed.profile) {
    throw new HttpError(403, 'Create a profile before using this route');
  }
  return authed.profile;
}

export function requireRole(req: Request, roles: ProfileRole[]) {
  const profile = requireProfile(req);
  if (!roles.includes(profile.role)) {
    throw new HttpError(403, 'Insufficient role');
  }
  return profile;
}
