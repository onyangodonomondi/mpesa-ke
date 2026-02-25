// ─────────────────────────────────────────────────────────────
//  mpesa-ke — Public API
//  Everything you need, in one import
// ─────────────────────────────────────────────────────────────

// Main client
export { Mpesa, createMpesa } from './mpesa.js';

// Types
export type {
    MpesaConfig,
    StkPushRequest,
    StkPushResponse,
    StkQueryRequest,
    StkQueryResponse,
    C2BRegisterRequest,
    C2BRegisterResponse,
    C2BSimulateRequest,
    C2BSimulateResponse,
    B2CRequest,
    B2CResponse,
    B2BRequest,
    B2BResponse,
    AccountBalanceRequest,
    AccountBalanceResponse,
    TransactionStatusRequest,
    TransactionStatusResponse,
    ReversalRequest,
    ReversalResponse,
    DynamicQRRequest,
    DynamicQRResponse,
    TaxRemittanceRequest,
    TaxRemittanceResponse,
    StkCallbackData,
    StkCallbackResult,
    StkCallbackItem,
    C2BCallbackData,
    AsyncResultData,
} from './types.js';

// Utilities
export {
    formatPhoneNumber,
    generateTimestamp,
    generatePassword,
    parseSafaricomDate,
    generateSecurityCredential,
    verifyWebhookIp,
} from './utils.js';

// Errors
export {
    MpesaError,
    MpesaAuthError,
    MpesaApiError,
    MpesaValidationError,
} from './errors.js';

// Callback parser (useful standalone)
export { parseStkCallback } from './express.js';
