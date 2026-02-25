/**
 * Fastify STK Push + Callback Example
 *
 * A complete Fastify server that:
 * 1. Initiates an STK push
 * 2. Handles the callback from Safaricom manually
 */

import Fastify from 'fastify';
import { Mpesa } from 'mpesa-ke';
import type { StkCallbackPayload } from 'mpesa-ke/types';

const fastify = Fastify({ logger: true });

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
fastify.post('/pay', async (request, reply) => {
    try {
        const { phoneNumber, amount, orderId } = request.body as {
            phoneNumber: string;
            amount: number;
            orderId: string;
        };

        const result = await mpesa.stkPush({
            phoneNumber,
            amount,
            accountReference: orderId,
            transactionDesc: `Payment for ${orderId}`,
        });

        return {
            success: true,
            checkoutRequestId: result.CheckoutRequestID,
            message: result.CustomerMessage,
        };
    } catch (error) {
        reply.status(500);
        return {
            success: false,
            error: (error as Error).message,
        };
    }
});

// ─── Handle M-Pesa Callback ────────────────────────────────
fastify.post('/mpesa/callback', async (request, reply) => {
    try {
        const payload = request.body as StkCallbackPayload;
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
            // await Order.updateOne(
            //   { checkoutId: callbackData.CheckoutRequestID },
            //   { status: 'paid', receipt: receipt }
            // );
        } else {
            // Payment failed or was cancelled
            console.log('❌ Payment failed:', callbackData.ResultDesc);
        }

        // Always reply with exactly this response to acknowledge receipt to Safaricom
        return {
            ResultCode: 0,
            ResultDesc: "Success"
        };
    } catch (error) {
        request.log.error(error);
        reply.status(500);
        return {
            ResultCode: 1,
            ResultDesc: "Failed to process callback"
        };
    }
});

// Start the server
fastify.listen({ port: 3000 }, (err) => {
    if (err) throw err;
    console.log('🚀 Fastify server running on http://localhost:3000');
});
