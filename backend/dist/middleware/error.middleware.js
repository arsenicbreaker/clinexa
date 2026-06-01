import { ZodError } from 'zod';
import { HttpError } from '../utils/http.js';
export function errorMiddleware(error, _req, res, _next) {
    if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
    }
    if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation failed', issues: error.issues });
    }
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return res.status(500).json({ error: message });
}
