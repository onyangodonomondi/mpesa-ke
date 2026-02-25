/**
 * Hono STK Push + Callback Example
 *
 * A complete Hono server that:
 * 1. Initiates an STK push
 * 2. Handles the callback from Safaricom manually
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { Mpesa } from 'mpesa-ke';
import type { StkCallbackPayload } from 'mpesa-ke/types';

const app = new Hono();

// Initialize M-Pesa client
const mpesa = new Mpesa({
    consumerKey: process.env.MPESA_CONSUMER_KEY!,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
    businessShortCode: process.env.MPESA_BUSINESS_SHORTCODE!,
    passKey: process.env.MPESA_PASSKEY!,
    environment: 'sandbox',
    callbackUrl: 'https://yourdomain.com/mpesa/callback',
});

// ─── Initiate STK Push ─────────────────────────────────────
app.post('/pay', async (c) => {
    try {
        const body = await c.req.json();
        const { phoneNumber, amount, orderId } = body;

        const result = await mpesa.stkPush({
            phoneNumber,
            amount,
            accountReference: orderId,
            transactionDesc: `Payment for ${orderId}`,
        });

        return c.json({
            success: true,
            checkoutRequestId: result.CheckoutRequestID,
            message: result.CustomerMessage,
        });
    } catch (error) {
        return c.json({
            success: false,
            error: (error as Error).message,
        }, 500);
    }
});

// ─── Handle M-Pesa Callback ────────────────────────────────
app.post('/mpesa/callback', async (c) => {
    try {
        const payload = await c.req.json<StkCallbackPayload>();
        const callbackData = payload.Body.stkCallback;

        if (callbackData.ResultCode === 0) {
            // Payment was successful (ResultCode 0)
            console.log('✅ Payment received!');

            const meta = callbackData.CallbackMetadata?.Item || [];
            const amount = meta.find(item => item.Name === 'Amount')?.Value;
            const receipt = meta.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            const phone = meta.find(item => item.Name === 'PhoneNumber')?.Value;

            console.log('  Receipt:', receipt);
            console.log('  Amount:', amount);
            console.log('  Phone:', phone);
            console.log('  Checkout ID:', callbackData.CheckoutRequestID);

            // TODO: Update your database
            // await db.updateOrder({
            //   checkoutId: callbackData.CheckoutRequestID,
            //   status: 'paid',
            //   receipt: receipt 
            // });
        } else {
            // Payment failed or was cancelled
            console.log('❌ Payment failed:', callbackData.ResultDesc);
        }

        // Always reply with exactly this response to acknowledge receipt to Safaricom
        return c.json({
            ResultCode: 0,
            ResultDesc: "Success"
        });
    } catch (error) {
        console.error('Callback error:', error);
        return c.json({
            ResultCode: 1,
            ResultDesc: "Failed to process callback"
        }, 500);
    }
});

serve({
    fetch: app.fetch,
    port: 3000
}, (info) => {
    console.log(`🚀 Hono server running on http://localhost:${info.port}`);
});
