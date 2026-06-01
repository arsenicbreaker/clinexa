import type { Response } from 'express';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export function sendCreated<T>(res: Response, data: T) {
  return res.status(201).json({ data });
}
