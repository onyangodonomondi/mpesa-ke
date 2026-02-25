/**
 * Next.js STK Push Example
 *
 * This example shows a complete STK Push integration:
 * 1. API route to initiate STK push
 * 2. Callback route to receive payment result
 *
 * File structure:
 *   app/api/mpesa/pay/route.ts     — STK Push endpoint
 *   app/api/mpesa/callback/route.ts — Callback handler
 */

// ─── app/api/mpesa/pay/route.ts ─────────────────────────────

import { Mpesa } from 'mpesa-ke';

const mpesa = new Mpesa({
    consumerKey: process.env.MPESA_CONSUMER_KEY!,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
    businessShortCode: process.env.MPESA_BUSINESS_SHORTCODE!,
    passKey: process.env.MPESA_PASSKEY!,
    environment: 'sandbox', // change to 'production' when going live
    callbackUrl: `${process.env.NEXT_PUBLIC_URL}/api/mpesa/callback`,
});

export async function POST(request: Request) {
    const { phoneNumber, amount, orderId } = await request.json();

    try {
        const result = await mpesa.stkPush({
            phoneNumber,
            amount,
            accountReference: orderId,
            transactionDesc: `Payment for order ${orderId}`,
        });

        return Response.json({
            success: true,
            checkoutRequestId: result.CheckoutRequestID,
            message: result.CustomerMessage,
        });
    } catch (error) {
        return Response.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}


// ─── app/api/mpesa/callback/route.ts ────────────────────────

import { createStkCallbackRoute } from 'mpesa-ke/nextjs';

export const POST_CALLBACK = createStkCallbackRoute({
    onResult: async (result) => {
        if (result.success) {
            console.log('✅ Payment successful!');
            console.log('  Receipt:', result.mpesaReceiptNumber);
            console.log('  Amount:', result.amount);
            console.log('  Phone:', result.phoneNumber);

            // Update your database here:
            // await db.orders.update({ ... });
        } else {
            console.log('❌ Payment failed:', result.resultDesc);
        }
    },
    onError: (error) => {
        console.error('Callback processing error:', error);
    },
});
