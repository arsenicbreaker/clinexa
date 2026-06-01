export class HttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
export function sendCreated(res, data) {
    return res.status(201).json({ data });
}
