// ─────────────────────────────────────────────────────────────
//  mpesa-ke — Main Client
//  Zero-dependency M-Pesa SDK using native fetch()
// ─────────────────────────────────────────────────────────────

import type {
    MpesaConfig,
    AccessTokenResponse,
    StkPushRequest,
    StkPushResponse,
    StkQueryRequest,
    StkQueryResponse,
    C2BRegisterRequest,
    C2BRegisterResponse,
    B2CRequest,
    B2CResponse,
    AccountBalanceRequest,
    AccountBalanceResponse,
    TransactionStatusRequest,
    TransactionStatusResponse,
    ReversalRequest,
    ReversalResponse,
    B2BRequest,
    B2BResponse,
    DynamicQRRequest,
    DynamicQRResponse,
    C2BSimulateRequest,
    C2BSimulateResponse,
    TaxRemittanceRequest,
    TaxRemittanceResponse,
} from './types.js';
import { formatPhoneNumber, generateTimestamp, generatePassword, generateSecurityCredential } from './utils.js';
import { MpesaAuthError, MpesaApiError, MpesaValidationError } from './errors.js';

const URLS = {
    sandbox: {
        auth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        api: 'https://sandbox.safaricom.co.ke',
    },
    production: {
        auth: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        api: 'https://api.safaricom.co.ke',
    },
} as const;

/**
 * M-Pesa SDK Client.
 *
 * @example
 * ```ts
 * import { Mpesa } from 'mpesa-ke';
 *
 * const mpesa = new Mpesa({
 *   consumerKey: 'your_key',
 *   consumerSecret: 'your_secret',
 *   businessShortCode: '174379',
 *   passKey: 'your_passkey',
 *   environment: 'sandbox',
 *   callbackUrl: 'https://example.com/callback',
 * });
 *
 * const result = await mpesa.stkPush({
 *   phoneNumber: '0712345678',
 *   amount: 100,
 *   accountReference: 'Order123',
 *   transactionDesc: 'Payment for order',
 * });
 * ```
 */
export class Mpesa {
    private readonly config: MpesaConfig;
    private readonly urls: { readonly auth: string; readonly api: string };
    private readonly timeout: number;
    private readonly debug: boolean;
    private readonly maxRetries: number;

    // Token cache
    private accessToken: string | null = null;
    private tokenExpiry = 0;

    constructor(config: MpesaConfig) {
        // Validate required fields
        if (!config.consumerKey) throw new MpesaValidationError('consumerKey is required', 'consumerKey');
        if (!config.consumerSecret) throw new MpesaValidationError('consumerSecret is required', 'consumerSecret');
        if (!config.businessShortCode) throw new MpesaValidationError('businessShortCode is required', 'businessShortCode');
        if (!config.passKey) throw new MpesaValidationError('passKey is required', 'passKey');
        if (!config.callbackUrl) throw new MpesaValidationError('callbackUrl is required', 'callbackUrl');

        this.config = config;
        this.urls = URLS[config.environment || 'sandbox'];
        this.timeout = config.timeout || 30000;
        this.debug = config.debug || false;
        this.maxRetries = config.retries || 0;
    }

    // ─── Auth ────────────────────────────────────────────────

    /**
     * Get an access token from Safaricom.
     * Tokens are cached and auto-refreshed 60s before expiry.
     */
    private async getAccessToken(): Promise<string> {
        // Return cached token if still valid
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        const credentials = Buffer.from(
            `${this.config.consumerKey}:${this.config.consumerSecret}`
        ).toString('base64');

        const response = await this.fetchWithTimeout(this.urls.auth, {
            method: 'GET',
            headers: {
                Authorization: `Basic ${credentials}`,
            },
        });

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new MpesaAuthError(
                `Authentication failed: ${response.status} ${response.statusText}`,
                response.status,
                body
            );
        }

        const data = (await response.json()) as AccessTokenResponse;
        this.accessToken = data.access_token;
        // Refresh 60 seconds before expiry
        this.tokenExpiry = Date.now() + (parseInt(data.expires_in) * 1000) - 60000;

        return this.accessToken;
    }

    /**
     * Get the security credential for B2C/B2B/Balance/Status operations.
     * If initiatorPassword is set, encrypts it with the Safaricom cert.
     * Falls back to the request-level credential or businessShortCode.
     */
    private getSecurityCredential(requestCredential?: string): string {
        if (requestCredential) return requestCredential;

        if (this.config.initiatorPassword) {
            return generateSecurityCredential(
                this.config.initiatorPassword,
                this.config.certificatePath
            );
        }

        return this.config.businessShortCode;
    }

    /** Get the initiator name from config or fall back to businessShortCode */
    private getInitiatorName(requestInitiator?: string): string {
        return requestInitiator || this.config.initiatorName || this.config.businessShortCode;
    }

    // ─── STK Push ────────────────────────────────────────────

    /**
     * Initiate an STK Push (Lipa Na M-Pesa Online).
     * This sends a payment prompt to the customer's phone.
     *
     * @example
     * ```ts
     * const result = await mpesa.stkPush({
     *   phoneNumber: '0712345678',
     *   amount: 100,
     *   accountReference: 'Order123',
     *   transactionDesc: 'Payment for order',
     * });
     * console.log(result.CheckoutRequestID);
     * ```
     */
    async stkPush(request: StkPushRequest): Promise<StkPushResponse> {
        const token = await this.getAccessToken();
        const timestamp = generateTimestamp();
        const password = generatePassword(
            this.config.businessShortCode,
            this.config.passKey,
            timestamp
        );

        const phone = formatPhoneNumber(request.phoneNumber);

        const body = {
            BusinessShortCode: this.config.businessShortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(request.amount),
            PartyA: phone,
            PartyB: this.config.businessShortCode,
            PhoneNumber: phone,
            CallBackURL: request.callbackUrl || this.config.callbackUrl,
            AccountReference: request.accountReference.substring(0, 12),
            TransactionDesc: request.transactionDesc.substring(0, 13),
        };

        return this.apiRequest<StkPushResponse>(
            '/mpesa/stkpush/v1/processrequest',
            body,
            token
        );
    }

    /**
     * Query the status of an STK Push request.
     *
     * @example
     * ```ts
     * const status = await mpesa.stkQuery({
     *   checkoutRequestId: 'ws_CO_25022026120000123456',
     * });
     * console.log(status.ResultCode); // "0" = success
     * ```
     */
    async stkQuery(request: StkQueryRequest): Promise<StkQueryResponse> {
        const token = await this.getAccessToken();
        const timestamp = generateTimestamp();
        const password = generatePassword(
            this.config.businessShortCode,
            this.config.passKey,
            timestamp
        );

        const body = {
            BusinessShortCode: this.config.businessShortCode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: request.checkoutRequestId,
        };

        return this.apiRequest<StkQueryResponse>(
            '/mpesa/stkpushquery/v1/query',
            body,
            token
        );
    }

    // ─── C2B ─────────────────────────────────────────────────

    /**
     * Register C2B confirmation and validation URLs.
     * Call this once to tell M-Pesa where to send payment notifications.
     *
     * @example
     * ```ts
     * await mpesa.c2bRegisterUrl({
     *   validationUrl: 'https://example.com/mpesa/validate',
     *   confirmationUrl: 'https://example.com/mpesa/confirm',
     * });
     * ```
     */
    async c2bRegisterUrl(request: C2BRegisterRequest): Promise<C2BRegisterResponse> {
        const token = await this.getAccessToken();

        const body = {
            ShortCode: this.config.businessShortCode,
            ResponseType: request.responseType || 'Completed',
            ConfirmationURL: request.confirmationUrl,
            ValidationURL: request.validationUrl,
        };

        return this.apiRequest<C2BRegisterResponse>(
            '/mpesa/c2b/v1/registerurl',
            body,
            token
        );
    }

    /**
     * Simulate a C2B payment (sandbox only).
     * Useful for testing your C2B callback handlers without real money.
     *
     * @example
     * ```ts
     * await mpesa.c2bSimulate({
     *   amount: 100,
     *   phoneNumber: '254712345678',
     *   billRefNumber: 'Test001',
     * });
     * ```
     */
    async c2bSimulate(request: C2BSimulateRequest): Promise<C2BSimulateResponse> {
        if (this.config.environment === 'production') {
            throw new MpesaValidationError(
                'C2B Simulate is only available in sandbox environment',
                'environment'
            );
        }

        const token = await this.getAccessToken();
        const phone = formatPhoneNumber(request.phoneNumber);

        const body = {
            ShortCode: this.config.businessShortCode,
            CommandID: request.commandId || 'CustomerPayBillOnline',
            Amount: Math.round(request.amount),
            Msisdn: phone,
            BillRefNumber: request.billRefNumber,
        };

        return this.apiRequest<C2BSimulateResponse>(
            '/mpesa/c2b/v1/simulate',
            body,
            token
        );
    }

    // ─── B2C ─────────────────────────────────────────────────

    /**
     * Send money from your business to a customer (B2C).
     *
     * @example
     * ```ts
     * const result = await mpesa.b2cPayment({
     *   phoneNumber: '0712345678',
     *   amount: 500,
     *   commandId: 'BusinessPayment',
     *   remarks: 'Refund for order #123',
     * });
     * ```
     */
    async b2cPayment(request: B2CRequest): Promise<B2CResponse> {
        const token = await this.getAccessToken();
        const phone = formatPhoneNumber(request.phoneNumber);

        const body = {
            InitiatorName: this.getInitiatorName(request.initiatorName),
            SecurityCredential: this.getSecurityCredential(request.securityCredential),
            CommandID: request.commandId || 'BusinessPayment',
            Amount: Math.round(request.amount),
            PartyA: this.config.businessShortCode,
            PartyB: phone,
            Remarks: request.remarks || 'Payment',
            QueueTimeOutURL: request.queueTimeoutUrl || this.config.callbackUrl,
            ResultURL: request.resultUrl || this.config.callbackUrl,
            Occassion: request.occasion || '',
        };

        return this.apiRequest<B2CResponse>(
            '/mpesa/b2c/v1/paymentrequest',
            body,
            token
        );
    }

    // ─── B2B ─────────────────────────────────────────────────

    /**
     * Send money from your business to another business (B2B).
     *
     * @example
     * ```ts
     * const result = await mpesa.b2bPayment({
     *   receiverShortCode: '600000',
     *   amount: 1000,
     *   commandId: 'BusinessPayBill',
     *   accountReference: 'INV001',
     *   remarks: 'Payment for services',
     * });
     * ```
     */
    async b2bPayment(request: B2BRequest): Promise<B2BResponse> {
        const token = await this.getAccessToken();

        const body = {
            Initiator: this.getInitiatorName(request.initiatorName),
            SecurityCredential: this.getSecurityCredential(request.securityCredential),
            CommandID: request.commandId || 'BusinessPayBill',
            SenderIdentifierType: '4',
            RecieverIdentifierType: request.receiverIdentifierType || '4',
            Amount: Math.round(request.amount),
            PartyA: this.config.businessShortCode,
            PartyB: request.receiverShortCode,
            AccountReference: request.accountReference || '',
            Remarks: request.remarks || 'B2B Payment',
            QueueTimeOutURL: request.queueTimeoutUrl || this.config.callbackUrl,
            ResultURL: request.resultUrl || this.config.callbackUrl,
        };

        return this.apiRequest<B2BResponse>(
            '/mpesa/b2b/v1/paymentrequest',
            body,
            token
        );
    }

    // ─── Account Balance ─────────────────────────────────────

    /**
     * Query your M-Pesa account balance.
     *
     * @example
     * ```ts
     * const result = await mpesa.accountBalance();
     * ```
     */
    async accountBalance(request: AccountBalanceRequest = {}): Promise<AccountBalanceResponse> {
        const token = await this.getAccessToken();

        const body = {
            Initiator: this.getInitiatorName(request.initiatorName),
            SecurityCredential: this.getSecurityCredential(request.securityCredential),
            CommandID: 'AccountBalance',
            PartyA: this.config.businessShortCode,
            IdentifierType: '4',
            Remarks: 'Account Balance Query',
            QueueTimeOutURL: request.queueTimeoutUrl || this.config.callbackUrl,
            ResultURL: request.resultUrl || this.config.callbackUrl,
        };

        return this.apiRequest<AccountBalanceResponse>(
            '/mpesa/accountbalance/v1/query',
            body,
            token
        );
    }

    // ─── Transaction Status ──────────────────────────────────

    /**
     * Query the status of a specific M-Pesa transaction.
     *
     * @example
     * ```ts
     * const result = await mpesa.transactionStatus({
     *   transactionId: 'OEI2AK4Q16',
     * });
     * ```
     */
    async transactionStatus(request: TransactionStatusRequest): Promise<TransactionStatusResponse> {
        const token = await this.getAccessToken();

        const body = {
            Initiator: this.getInitiatorName(request.initiatorName),
            SecurityCredential: this.getSecurityCredential(request.securityCredential),
            CommandID: 'TransactionStatusQuery',
            TransactionID: request.transactionId,
            PartyA: this.config.businessShortCode,
            IdentifierType: '4',
            ResultURL: request.resultUrl || this.config.callbackUrl,
            QueueTimeOutURL: request.queueTimeoutUrl || this.config.callbackUrl,
            Remarks: 'Transaction Status Query',
            Occasion: '',
        };

        return this.apiRequest<TransactionStatusResponse>(
            '/mpesa/transactionstatus/v1/query',
            body,
            token
        );
    }

    // ─── Reversal ────────────────────────────────────────────

    /**
     * Reverse a completed M-Pesa transaction.
     *
     * @example
     * ```ts
     * const result = await mpesa.reversal({
     *   transactionId: 'OEI2AK4Q16',
     *   amount: 100,
     *   remarks: 'Wrong transaction',
     * });
     * ```
     */
    async reversal(request: ReversalRequest): Promise<ReversalResponse> {
        const token = await this.getAccessToken();

        const body = {
            Initiator: this.getInitiatorName(request.initiatorName),
            SecurityCredential: this.getSecurityCredential(request.securityCredential),
            CommandID: 'TransactionReversal',
            TransactionID: request.transactionId,
            Amount: Math.round(request.amount),
            ReceiverParty: this.config.businessShortCode,
            RecieverIdentifierType: '4',
            ResultURL: request.resultUrl || this.config.callbackUrl,
            QueueTimeOutURL: request.queueTimeoutUrl || this.config.callbackUrl,
            Remarks: request.remarks || 'Reversal',
            Occasion: request.occasion || '',
        };

        return this.apiRequest<ReversalResponse>(
            '/mpesa/reversal/v1/request',
            body,
            token
        );
    }

    // ─── Dynamic QR Code ─────────────────────────────────────

    /**
     * Generate a dynamic M-Pesa QR code for payment.
     *
     * @example
     * ```ts
     * const result = await mpesa.dynamicQR({
     *   merchantName: 'My Shop',
     *   refNo: 'Order123',
     *   amount: 500,
     *   transactionType: 'BG', // Buy Goods
     *   creditPartyIdentifier: '174379',
     * });
     * console.log(result.QRCode); // Base64-encoded QR image
     * ```
     */
    async dynamicQR(request: DynamicQRRequest): Promise<DynamicQRResponse> {
        const token = await this.getAccessToken();

        const body = {
            MerchantName: request.merchantName,
            RefNo: request.refNo,
            Amount: Math.round(request.amount),
            TrxCode: request.transactionType,
            CPI: request.creditPartyIdentifier,
            Size: '300',
        };

        return this.apiRequest<DynamicQRResponse>(
            '/mpesa/qrcode/v1/generate',
            body,
            token
        );
    }

    // ─── Tax Remittance ──────────────────────────────────────

    /**
     * Remit tax to KRA via M-Pesa.
     *
     * @example
     * ```ts
     * const result = await mpesa.taxRemittance({
     *   amount: 5000,
     *   accountReference: 'KRA_PIN_HERE',
     *   receiverShortCode: '572572',
     *   remarks: 'Tax remittance',
     * });
     * ```
     */
    async taxRemittance(request: TaxRemittanceRequest): Promise<TaxRemittanceResponse> {
        const token = await this.getAccessToken();

        const body = {
            Initiator: this.getInitiatorName(request.initiatorName),
            SecurityCredential: this.getSecurityCredential(request.securityCredential),
            CommandID: 'PayTaxToKRA',
            SenderIdentifierType: '4',
            RecieverIdentifierType: '4',
            Amount: Math.round(request.amount),
            PartyA: this.config.businessShortCode,
            PartyB: request.receiverShortCode,
            AccountReference: request.accountReference,
            Remarks: request.remarks || 'Tax Remittance',
            QueueTimeOutURL: request.queueTimeoutUrl || this.config.callbackUrl,
            ResultURL: request.resultUrl || this.config.callbackUrl,
        };

        return this.apiRequest<TaxRemittanceResponse>(
            '/mpesa/tax/v1/remittance',
            body,
            token
        );
    }

    // ─── Internal Helpers ────────────────────────────────────

    /** Debug log helper */
    private log(message: string, data?: unknown): void {
        if (this.debug) {
            console.log(`[mpesa-ke] ${message}`, data !== undefined ? data : '');
        }
    }

    /**
     * Make an authenticated API request to Safaricom with retry support.
     */
    private async apiRequest<T>(
        path: string,
        body: Record<string, unknown>,
        token: string
    ): Promise<T> {
        const url = `${this.urls.api}${path}`;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    // Exponential backoff: 1s, 2s, 4s, 8s...
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    this.log(`Retry attempt ${attempt}/${this.maxRetries} after ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                this.log(`${path}`, { method: 'POST', body });

                const response = await this.fetchWithTimeout(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                });

                const data = await response.json().catch(() => ({}));

                this.log(`Response ${response.status}`, data);

                if (!response.ok) {
                    const errorMessage =
                        (data as Record<string, string>).errorMessage ||
                        (data as Record<string, string>).ResultDesc ||
                        `API request failed: ${response.status} ${response.statusText}`;

                    const error = new MpesaApiError(
                        errorMessage,
                        response.status,
                        data,
                        (data as Record<string, string>).errorCode
                    );

                    // Only retry on 5xx server errors or network issues
                    if (response.status >= 500 && attempt < this.maxRetries) {
                        lastError = error;
                        continue;
                    }

                    throw error;
                }

                return data as T;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // Don't retry on client errors (4xx) or validation errors
                if (error instanceof MpesaApiError && error.statusCode && error.statusCode < 500) {
                    throw error;
                }

                if (attempt >= this.maxRetries) {
                    throw lastError;
                }
            }
        }

        throw lastError || new MpesaApiError('Request failed after all retries');
    }

    /**
     * Fetch with a timeout using AbortController.
     */
    private async fetchWithTimeout(
        url: string,
        options: RequestInit
    ): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            return response;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new MpesaApiError(`Request timed out after ${this.timeout}ms`);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

// ─── Factory Functions ────────────────────────────────────

/**
 * Create an Mpesa instance from environment variables.
 *
 * Expected env vars:
 * - `MPESA_CONSUMER_KEY`
 * - `MPESA_CONSUMER_SECRET`
 * - `MPESA_BUSINESS_SHORTCODE`
 * - `MPESA_PASSKEY`
 * - `MPESA_ENVIRONMENT` (optional, defaults to 'sandbox')
 * - `MPESA_CALLBACK_URL`
 * - `MPESA_INITIATOR_NAME` (optional)
 * - `MPESA_INITIATOR_PASSWORD` (optional)
 * - `MPESA_CERTIFICATE_PATH` (optional)
 *
 * @example
 * ```ts
 * import { createMpesa } from 'mpesa-ke';
 * const mpesa = createMpesa(); // reads from process.env
 * ```
 */
export function createMpesa(): Mpesa {
    const env = process.env;

    const config: MpesaConfig = {
        consumerKey: (env.MPESA_CONSUMER_KEY || '').trim(),
        consumerSecret: (env.MPESA_CONSUMER_SECRET || '').trim(),
        businessShortCode: (env.MPESA_BUSINESS_SHORTCODE || '').trim(),
        passKey: (env.MPESA_PASSKEY || '').trim(),
        environment: (env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
        callbackUrl: (env.MPESA_CALLBACK_URL || '').trim(),
        initiatorName: env.MPESA_INITIATOR_NAME?.trim(),
        initiatorPassword: env.MPESA_INITIATOR_PASSWORD?.trim(),
        certificatePath: env.MPESA_CERTIFICATE_PATH?.trim(),
        debug: env.MPESA_DEBUG === 'true',
        retries: parseInt(env.MPESA_RETRIES || '0') || 0,
    };

    return new Mpesa(config);
}
