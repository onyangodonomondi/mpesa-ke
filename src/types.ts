// ─────────────────────────────────────────────────────────────
//  mpesa-ke — TypeScript Types
//  All interfaces for the Safaricom Daraja API
// ─────────────────────────────────────────────────────────────

/** SDK configuration */
export interface MpesaConfig {
    /** OAuth Consumer Key from Safaricom Developer Portal */
    consumerKey: string;
    /** OAuth Consumer Secret from Safaricom Developer Portal */
    consumerSecret: string;
    /** Your M-Pesa Business Short Code (Paybill or Till Number) */
    businessShortCode: string;
    /** Lipa Na M-Pesa Online Passkey (from Safaricom) */
    passKey: string;
    /** API environment */
    environment: 'sandbox' | 'production';
    /** Default callback URL for async results */
    callbackUrl: string;
    /** Request timeout in milliseconds (default: 30000) */
    timeout?: number;
}

// ─── Auth ────────────────────────────────────────────────────

export interface AccessTokenResponse {
    access_token: string;
    expires_in: string;
}

// ─── STK Push (Lipa Na M-Pesa Online) ───────────────────────

export interface StkPushRequest {
    /** Customer phone number (any Kenyan format: 0712..., +254712..., 254712...) */
    phoneNumber: string;
    /** Amount to charge (KES, whole numbers) */
    amount: number;
    /** Account reference shown on customer's phone (max 12 chars) */
    accountReference: string;
    /** Description of the transaction */
    transactionDesc: string;
    /** Override the default callback URL */
    callbackUrl?: string;
}

export interface StkPushResponse {
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResponseCode: string;
    ResponseDescription: string;
    CustomerMessage: string;
}

export interface StkQueryRequest {
    /** CheckoutRequestID from the STK push response */
    checkoutRequestId: string;
}

export interface StkQueryResponse {
    ResponseCode: string;
    ResponseDescription: string;
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResultCode: string;
    ResultDesc: string;
}

// ─── C2B (Customer to Business) ─────────────────────────────

export interface C2BRegisterRequest {
    /** URL to receive validation requests */
    validationUrl: string;
    /** URL to receive confirmation notifications */
    confirmationUrl: string;
    /** How to handle failed validations */
    responseType?: 'Completed' | 'Cancelled';
}

export interface C2BRegisterResponse {
    OriginatorConversationID: string;
    ConversationID: string;
    ResponseDescription: string;
}

// ─── B2C (Business to Customer) ─────────────────────────────

export interface B2CRequest {
    /** Recipient phone number */
    phoneNumber: string;
    /** Amount to send */
    amount: number;
    /** Type of B2C payment */
    commandId?: 'SalaryPayment' | 'BusinessPayment' | 'PromotionPayment';
    /** Description / remarks */
    remarks?: string;
    /** Occasion for the payment */
    occasion?: string;
    /** Initiator name (defaults to businessShortCode) */
    initiatorName?: string;
    /** Encrypted security credential */
    securityCredential?: string;
    /** Override result URL */
    resultUrl?: string;
    /** Override timeout URL */
    queueTimeoutUrl?: string;
}

export interface B2CResponse {
    ConversationID: string;
    OriginatorConversationID: string;
    ResponseCode: string;
    ResponseDescription: string;
}

// ─── Account Balance ────────────────────────────────────────

export interface AccountBalanceRequest {
    /** Initiator name (defaults to businessShortCode) */
    initiatorName?: string;
    /** Encrypted security credential */
    securityCredential?: string;
    /** Override result URL */
    resultUrl?: string;
    /** Override timeout URL */
    queueTimeoutUrl?: string;
}

export interface AccountBalanceResponse {
    OriginatorConversationID: string;
    ConversationID: string;
    ResponseCode: string;
    ResponseDescription: string;
}

// ─── Transaction Status ─────────────────────────────────────

export interface TransactionStatusRequest {
    /** The M-Pesa transaction ID to query */
    transactionId: string;
    /** Initiator name (defaults to businessShortCode) */
    initiatorName?: string;
    /** Encrypted security credential */
    securityCredential?: string;
    /** Override result URL */
    resultUrl?: string;
    /** Override timeout URL */
    queueTimeoutUrl?: string;
}

export interface TransactionStatusResponse {
    OriginatorConversationID: string;
    ConversationID: string;
    ResponseCode: string;
    ResponseDescription: string;
}

// ─── Reversal ───────────────────────────────────────────────

export interface ReversalRequest {
    /** The M-Pesa transaction ID to reverse */
    transactionId: string;
    /** Amount to reverse */
    amount: number;
    /** Initiator name */
    initiatorName?: string;
    /** Encrypted security credential */
    securityCredential?: string;
    /** Remarks */
    remarks?: string;
    /** Occasion */
    occasion?: string;
    /** Override result URL */
    resultUrl?: string;
    /** Override timeout URL */
    queueTimeoutUrl?: string;
}

export interface ReversalResponse {
    OriginatorConversationID: string;
    ConversationID: string;
    ResponseCode: string;
    ResponseDescription: string;
}

// ─── Callback Data ──────────────────────────────────────────

export interface StkCallbackItem {
    Name: string;
    Value: string | number;
}

export interface StkCallbackData {
    Body: {
        stkCallback: {
            MerchantRequestID: string;
            CheckoutRequestID: string;
            ResultCode: number;
            ResultDesc: string;
            CallbackMetadata?: {
                Item: StkCallbackItem[];
            };
        };
    };
}

/** Parsed STK callback result (simplified) */
export interface StkCallbackResult {
    /** Whether the payment was successful */
    success: boolean;
    /** Result code from Safaricom (0 = success) */
    resultCode: number;
    /** Human-readable result description */
    resultDesc: string;
    /** Merchant request ID */
    merchantRequestId: string;
    /** Checkout request ID */
    checkoutRequestId: string;
    /** M-Pesa receipt number (only on success) */
    mpesaReceiptNumber: string | null;
    /** Transaction date (only on success) */
    transactionDate: Date | null;
    /** Phone number (only on success) */
    phoneNumber: string | null;
    /** Amount paid (only on success) */
    amount: number | null;
}

/** C2B confirmation webhook payload */
export interface C2BCallbackData {
    TransactionType: string;
    TransID: string;
    TransTime: string;
    TransAmount: number;
    BusinessShortCode: string;
    BillRefNumber: string;
    InvoiceNumber: string;
    OrgAccountBalance: number;
    ThirdPartyTransID: string;
    MSISDN: string;
    FirstName: string;
    MiddleName: string;
    LastName: string;
}

/** Generic async result payload (B2C, Balance, Status, Reversal) */
export interface AsyncResultData {
    Result: {
        ResultType: number;
        ResultCode: number;
        ResultDesc: string;
        OriginatorConversationID: string;
        ConversationID: string;
        TransactionID: string;
        ResultParameters?: {
            ResultParameter: Array<{ Key: string; Value: string | number }>;
        };
        ReferenceData?: {
            ReferenceItem: { Key: string; Value: string } | Array<{ Key: string; Value: string }>;
        };
    };
}
