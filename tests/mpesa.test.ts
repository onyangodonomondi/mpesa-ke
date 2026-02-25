import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Mpesa } from '../src/mpesa';
import { MpesaValidationError, MpesaAuthError } from '../src/errors';
import { parseStkCallback } from '../src/express';

const VALID_CONFIG = {
    consumerKey: 'test_key',
    consumerSecret: 'test_secret',
    businessShortCode: '174379',
    passKey: 'test_passkey',
    environment: 'sandbox' as const,
    callbackUrl: 'https://example.com/callback',
};

describe('Mpesa constructor', () => {
    it('creates an instance with valid config', () => {
        const mpesa = new Mpesa(VALID_CONFIG);
        expect(mpesa).toBeInstanceOf(Mpesa);
    });

    it('throws MpesaValidationError if consumerKey is missing', () => {
        expect(() => new Mpesa({ ...VALID_CONFIG, consumerKey: '' }))
            .toThrow(MpesaValidationError);
    });

    it('throws MpesaValidationError if consumerSecret is missing', () => {
        expect(() => new Mpesa({ ...VALID_CONFIG, consumerSecret: '' }))
            .toThrow(MpesaValidationError);
    });

    it('throws MpesaValidationError if businessShortCode is missing', () => {
        expect(() => new Mpesa({ ...VALID_CONFIG, businessShortCode: '' }))
            .toThrow(MpesaValidationError);
    });

    it('throws MpesaValidationError if passKey is missing', () => {
        expect(() => new Mpesa({ ...VALID_CONFIG, passKey: '' }))
            .toThrow(MpesaValidationError);
    });

    it('throws MpesaValidationError if callbackUrl is missing', () => {
        expect(() => new Mpesa({ ...VALID_CONFIG, callbackUrl: '' }))
            .toThrow(MpesaValidationError);
    });
});

describe('Mpesa.stkPush', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('makes correct API call for STK push', async () => {
        const mockFetch = vi.fn()
            // First call: auth
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ access_token: 'test_token', expires_in: '3599' }),
            })
            // Second call: STK push
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    MerchantRequestID: 'merchant_123',
                    CheckoutRequestID: 'checkout_123',
                    ResponseCode: '0',
                    ResponseDescription: 'Success',
                    CustomerMessage: 'Check your phone',
                }),
            });

        vi.stubGlobal('fetch', mockFetch);

        const mpesa = new Mpesa(VALID_CONFIG);
        const result = await mpesa.stkPush({
            phoneNumber: '0712345678',
            amount: 100,
            accountReference: 'Test',
            transactionDesc: 'Test payment',
        });

        expect(result.CheckoutRequestID).toBe('checkout_123');
        expect(result.ResponseCode).toBe('0');

        // Verify auth call
        expect(mockFetch).toHaveBeenCalledTimes(2);
        const authCall = mockFetch.mock.calls[0];
        expect(authCall[0]).toContain('sandbox.safaricom.co.ke/oauth');

        // Verify STK push call
        const stkCall = mockFetch.mock.calls[1];
        expect(stkCall[0]).toContain('stkpush/v1/processrequest');
        const stkBody = JSON.parse(stkCall[1].body);
        expect(stkBody.PhoneNumber).toBe('254712345678');
        expect(stkBody.Amount).toBe(100);
        expect(stkBody.BusinessShortCode).toBe('174379');
    });

    it('throws MpesaAuthError on auth failure', async () => {
        const mockFetch = vi.fn().mockResolvedValueOnce({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            text: async () => 'Invalid credentials',
        });

        vi.stubGlobal('fetch', mockFetch);

        const mpesa = new Mpesa(VALID_CONFIG);
        await expect(
            mpesa.stkPush({
                phoneNumber: '0712345678',
                amount: 100,
                accountReference: 'Test',
                transactionDesc: 'Test',
            })
        ).rejects.toThrow(MpesaAuthError);
    });
});

describe('parseStkCallback', () => {
    it('parses a successful STK callback', () => {
        const body = {
            Body: {
                stkCallback: {
                    MerchantRequestID: 'merchant_123',
                    CheckoutRequestID: 'checkout_123',
                    ResultCode: 0,
                    ResultDesc: 'The service request is processed successfully.',
                    CallbackMetadata: {
                        Item: [
                            { Name: 'Amount', Value: 100 },
                            { Name: 'MpesaReceiptNumber', Value: 'ABC123XYZ' },
                            { Name: 'TransactionDate', Value: 20260225120000 },
                            { Name: 'PhoneNumber', Value: 254712345678 },
                        ],
                    },
                },
            },
        };

        const result = parseStkCallback(body);

        expect(result.success).toBe(true);
        expect(result.resultCode).toBe(0);
        expect(result.mpesaReceiptNumber).toBe('ABC123XYZ');
        expect(result.amount).toBe(100);
        expect(result.phoneNumber).toBe('254712345678');
        expect(result.transactionDate).toBeInstanceOf(Date);
    });

    it('parses a failed STK callback', () => {
        const body = {
            Body: {
                stkCallback: {
                    MerchantRequestID: 'merchant_123',
                    CheckoutRequestID: 'checkout_123',
                    ResultCode: 1032,
                    ResultDesc: 'Request cancelled by user.',
                },
            },
        };

        const result = parseStkCallback(body);

        expect(result.success).toBe(false);
        expect(result.resultCode).toBe(1032);
        expect(result.mpesaReceiptNumber).toBeNull();
        expect(result.amount).toBeNull();
    });
});
