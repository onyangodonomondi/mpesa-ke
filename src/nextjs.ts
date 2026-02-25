// ─────────────────────────────────────────────────────────────
//  mpesa-ke — Next.js App Router Helpers
//  Drop-in route handlers for M-Pesa callbacks in Next.js
// ─────────────────────────────────────────────────────────────

import type { StkCallbackData, StkCallbackResult, C2BCallbackData, AsyncResultData } from './types.js';
import { parseStkCallback } from './express.js';

// Re-export parseStkCallback for convenience
export { parseStkCallback } from './express.js';

/** Options for the Next.js STK callback route handler */
export interface NextStkCallbackOptions {
    /** Called when a payment result is received (success or failure) */
    onResult: (result: StkCallbackResult) => void | Promise<void>;
    /** Called when an error occurs during processing */
    onError?: (error: Error) => void | Promise<void>;
}

/** Options for the Next.js C2B callback route handler */
export interface NextC2BCallbackOptions {
    /** Called when a C2B payment confirmation is received */
    onPayment: (data: C2BCallbackData) => void | Promise<void>;
    /** Called when an error occurs during processing */
    onError?: (error: Error) => void | Promise<void>;
}

/** Options for the Next.js async result handler */
export interface NextAsyncResultOptions {
    /** Called when an async result is received */
    onResult: (data: AsyncResultData) => void | Promise<void>;
    /** Called when an error occurs during processing */
    onError?: (error: Error) => void | Promise<void>;
}

/**
 * Create a Next.js App Router POST handler for STK Push callbacks.
 *
 * @example
 * ```ts
 * // app/api/mpesa/callback/route.ts
 * import { createStkCallbackRoute } from 'mpesa-ke/nextjs';
 *
 * export const POST = createStkCallbackRoute({
 *   onResult: async (result) => {
 *     if (result.success) {
 *       // Update your database
 *       await db.orders.update({
 *         where: { checkoutId: result.checkoutRequestId },
 *         data: { status: 'paid', receipt: result.mpesaReceiptNumber },
 *       });
 *     }
 *   },
 * });
 * ```
 */
export function createStkCallbackRoute(options: NextStkCallbackOptions) {
    return async (request: Request): Promise<Response> => {
        try {
            const body = (await request.json()) as StkCallbackData;
            const result = parseStkCallback(body);
            await options.onResult(result);

            return Response.json(
                { ResultCode: 0, ResultDesc: 'Accepted' },
                { status: 200 }
            );
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            if (options.onError) {
                await options.onError(err);
            }
            // Always return success to prevent Safaricom retries
            return Response.json(
                { ResultCode: 0, ResultDesc: 'Accepted' },
                { status: 200 }
            );
        }
    };
}

/**
 * Create a Next.js App Router POST handler for C2B confirmation callbacks.
 *
 * @example
 * ```ts
 * // app/api/mpesa/confirm/route.ts
 * import { createC2BCallbackRoute } from 'mpesa-ke/nextjs';
 *
 * export const POST = createC2BCallbackRoute({
 *   onPayment: async (data) => {
 *     console.log(`KES ${data.TransAmount} from ${data.MSISDN}`);
 *   },
 * });
 * ```
 */
export function createC2BCallbackRoute(options: NextC2BCallbackOptions) {
    return async (request: Request): Promise<Response> => {
        try {
            const body = (await request.json()) as C2BCallbackData;
            await options.onPayment(body);

            return Response.json(
                { ResultCode: 0, ResultDesc: 'Accepted' },
                { status: 200 }
            );
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            if (options.onError) {
                await options.onError(err);
            }
            return Response.json(
                { ResultCode: 0, ResultDesc: 'Accepted' },
                { status: 200 }
            );
        }
    };
}

/**
 * Create a Next.js App Router POST handler for async result callbacks.
 * Works for B2C, Account Balance, Transaction Status, and Reversal results.
 *
 * @example
 * ```ts
 * // app/api/mpesa/result/route.ts
 * import { createAsyncResultRoute } from 'mpesa-ke/nextjs';
 *
 * export const POST = createAsyncResultRoute({
 *   onResult: async (data) => {
 *     if (data.Result.ResultCode === 0) {
 *       console.log('Transaction successful');
 *     }
 *   },
 * });
 * ```
 */
export function createAsyncResultRoute(options: NextAsyncResultOptions) {
    return async (request: Request): Promise<Response> => {
        try {
            const body = (await request.json()) as AsyncResultData;
            await options.onResult(body);

            return Response.json(
                { ResultCode: 0, ResultDesc: 'Accepted' },
                { status: 200 }
            );
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            if (options.onError) {
                await options.onError(err);
            }
            return Response.json(
                { ResultCode: 0, ResultDesc: 'Accepted' },
                { status: 200 }
            );
        }
    };
}
