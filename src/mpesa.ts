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
} from './types.js';
import { formatPhoneNumber, generateTimestamp, generatePassword } from './utils.js';
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
            InitiatorName: request.initiatorName || this.config.businessShortCode,
            SecurityCredential: request.securityCredential || this.config.businessShortCode,
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
            Initiator: request.initiatorName || this.config.businessShortCode,
            SecurityCredential: request.securityCredential || this.config.businessShortCode,
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
            Initiator: request.initiatorName || this.config.businessShortCode,
            SecurityCredential: request.securityCredential || this.config.businessShortCode,
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
            Initiator: request.initiatorName || this.config.businessShortCode,
            SecurityCredential: request.securityCredential || this.config.businessShortCode,
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

    // ─── Internal Helpers ────────────────────────────────────

    /**
     * Make an authenticated API request to Safaricom.
     */
    private async apiRequest<T>(
        path: string,
        body: Record<string, unknown>,
        token: string
    ): Promise<T> {
        const url = `${this.urls.api}${path}`;

        const response = await this.fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMessage =
                (data as Record<string, string>).errorMessage ||
                (data as Record<string, string>).ResultDesc ||
                `API request failed: ${response.status} ${response.statusText}`;

            throw new MpesaApiError(
                errorMessage,
                response.status,
                data,
                (data as Record<string, string>).errorCode
            );
        }

        return data as T;
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
    };

    return new Mpesa(config);
}
