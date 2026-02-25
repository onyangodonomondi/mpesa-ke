// ─────────────────────────────────────────────────────────────
//  mpesa-ke — Error Classes
//  Typed errors for better error handling
// ─────────────────────────────────────────────────────────────

/**
 * Base error for all M-Pesa SDK errors.
 */
export class MpesaError extends Error {
    /** HTTP status code (if applicable) */
    public readonly statusCode?: number;
    /** Raw error response from Safaricom API */
    public readonly response?: unknown;

    constructor(message: string, statusCode?: number, response?: unknown) {
        super(message);
        this.name = 'MpesaError';
        this.statusCode = statusCode;
        this.response = response;

        // Fix prototype chain for instanceof checks
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Authentication error — failed to get access token.
 * Usually means invalid Consumer Key or Consumer Secret.
 */
export class MpesaAuthError extends MpesaError {
    constructor(message: string, statusCode?: number, response?: unknown) {
        super(message, statusCode, response);
        this.name = 'MpesaAuthError';
    }
}

/**
 * API error — the request was made but Safaricom returned an error.
 * Check `statusCode` and `response` for details.
 */
export class MpesaApiError extends MpesaError {
    /** Safaricom error code (if available) */
    public readonly errorCode?: string;

    constructor(message: string, statusCode?: number, response?: unknown, errorCode?: string) {
        super(message, statusCode, response);
        this.name = 'MpesaApiError';
        this.errorCode = errorCode;
    }
}

/**
 * Validation error — invalid input before making any API call.
 */
export class MpesaValidationError extends MpesaError {
    /** Which field failed validation */
    public readonly field?: string;

    constructor(message: string, field?: string) {
        super(message);
        this.name = 'MpesaValidationError';
        this.field = field;
    }
}
