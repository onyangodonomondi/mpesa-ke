// ─────────────────────────────────────────────────────────────
//  mpesa-ke — Express/Fastify Callback Handler
//  Drop-in middleware for handling M-Pesa callbacks
// ─────────────────────────────────────────────────────────────

import type { StkCallbackData, StkCallbackResult, C2BCallbackData, AsyncResultData } from './types.js';
import { parseSafaricomDate } from './utils.js';

/**
 * Parse an STK Push callback body into a clean result object.
 *
 * @example
 * ```ts
 * app.post('/mpesa/callback', (req, res) => {
 *   const result = parseStkCallback(req.body);
 *   if (result.success) {
 *     console.log('Paid!', result.mpesaReceiptNumber);
 *   }
 *   res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
 * });
 * ```
 */
export function parseStkCallback(body: StkCallbackData): StkCallbackResult {
    const callback = body.Body.stkCallback;

    const result: StkCallbackResult = {
        success: callback.ResultCode === 0,
        resultCode: callback.ResultCode,
        resultDesc: callback.ResultDesc,
        merchantRequestId: callback.MerchantRequestID,
        checkoutRequestId: callback.CheckoutRequestID,
        mpesaReceiptNumber: null,
        transactionDate: null,
        phoneNumber: null,
        amount: null,
    };

    // Extract metadata on success
    if (callback.ResultCode === 0 && callback.CallbackMetadata) {
        for (const item of callback.CallbackMetadata.Item) {
            switch (item.Name) {
                case 'MpesaReceiptNumber':
                    result.mpesaReceiptNumber = String(item.Value);
                    break;
                case 'TransactionDate':
                    result.transactionDate = parseSafaricomDate(item.Value);
                    break;
                case 'PhoneNumber':
                    result.phoneNumber = String(item.Value);
                    break;
                case 'Amount':
                    result.amount = Number(item.Value);
                    break;
            }
        }
    }

    return result;
}

/** Options for the Express STK callback handler */
export interface StkCallbackHandlerOptions {
    /** Called when a payment result is received (success or failure) */
    onResult: (result: StkCallbackResult) => void | Promise<void>;
    /** Called when an error occurs during processing */
    onError?: (error: Error) => void | Promise<void>;
}

/** Options for the Express C2B callback handler */
export interface C2BCallbackHandlerOptions {
    /** Called when a C2B payment confirmation is received */
    onPayment: (data: C2BCallbackData) => void | Promise<void>;
    /** Called when an error occurs during processing */
    onError?: (error: Error) => void | Promise<void>;
}

/** Options for the Express async result handler */
export interface AsyncResultHandlerOptions {
    /** Called when an async result is received (B2C, Balance, Status, etc.) */
    onResult: (data: AsyncResultData) => void | Promise<void>;
    /** Called when an error occurs during processing */
    onError?: (error: Error) => void | Promise<void>;
}

// Express-compatible request/response types (minimal, no Express dependency)
interface ExpressLikeRequest {
    body: unknown;
}

interface ExpressLikeResponse {
    status: (code: number) => ExpressLikeResponse;
    json: (data: unknown) => void;
}

/**
 * Create an Express-compatible route handler for STK Push callbacks.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { createStkCallbackHandler } from 'mpesa-ke/express';
 *
 * const app = express();
 * app.use(express.json());
 *
 * app.post('/mpesa/callback', createStkCallbackHandler({
 *   onResult: async (result) => {
 *     if (result.success) {
 *       await db.orders.update({
 *         where: { checkoutId: result.checkoutRequestId },
 *         data: { status: 'paid', receipt: result.mpesaReceiptNumber },
 *       });
 *     }
 *   },
 *   onError: (err) => console.error('Callback error:', err),
 * }));
 * ```
 */
export function createStkCallbackHandler(options: StkCallbackHandlerOptions) {
    return async (req: ExpressLikeRequest, res: ExpressLikeResponse) => {
        try {
            const result = parseStkCallback(req.body as StkCallbackData);
            await options.onResult(result);
            // Safaricom expects this exact response
            res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            if (options.onError) {
                await options.onError(err);
            }
            // Still return success to prevent Safaricom retries
            res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }
    };
}

/**
 * Create an Express-compatible route handler for C2B confirmation callbacks.
 *
 * @example
 * ```ts
 * app.post('/mpesa/confirm', createC2BCallbackHandler({
 *   onPayment: async (data) => {
 *     console.log(`Received KES ${data.TransAmount} from ${data.MSISDN}`);
 *   },
 * }));
 * ```
 */
export function createC2BCallbackHandler(options: C2BCallbackHandlerOptions) {
    return async (req: ExpressLikeRequest, res: ExpressLikeResponse) => {
        try {
            const data = req.body as C2BCallbackData;
            await options.onPayment(data);
            res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            if (options.onError) {
                await options.onError(err);
            }
            res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }
    };
}

/**
 * Create an Express-compatible route handler for async result callbacks.
 * Works for B2C, Account Balance, Transaction Status, and Reversal results.
 *
 * @example
 * ```ts
 * app.post('/mpesa/result', createAsyncResultHandler({
 *   onResult: async (data) => {
 *     console.log(`Result: ${data.Result.ResultDesc}`);
 *   },
 * }));
 * ```
 */
export function createAsyncResultHandler(options: AsyncResultHandlerOptions) {
    return async (req: ExpressLikeRequest, res: ExpressLikeResponse) => {
        try {
            const data = req.body as AsyncResultData;
            await options.onResult(data);
            res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            if (options.onError) {
                await options.onError(err);
            }
            res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }
    };
}
