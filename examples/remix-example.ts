/**
 * Remix STK Push + Callback Example
 *
 * This example shows an STK Push integration in Remix:
 * 1. Action route to initiate STK push via form submission
 * 2. Resource route to receive payment result (callback)
 *
 * File structure:
 *   app/routes/pay.tsx      — STK Push form & action
 *   app/routes/callback.ts  — Callback handler resource route
 */

// ─── app/routes/pay.tsx ─────────────────────────────────────

import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { useActionData, Form } from '@remix-run/react';
import { Mpesa } from 'mpesa-ke';

const mpesa = new Mpesa({
    consumerKey: process.env.MPESA_CONSUMER_KEY!,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
    businessShortCode: process.env.MPESA_BUSINESS_SHORTCODE!,
    passKey: process.env.MPESA_PASSKEY!,
    environment: 'sandbox',
    callbackUrl: 'https://yourdomain.com/callback',
});

export const action = async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();
    const phoneNumber = formData.get('phoneNumber') as string;
    const amount = Number(formData.get('amount'));
    const orderId = formData.get('orderId') as string;

    try {
        const result = await mpesa.stkPush({
            phoneNumber,
            amount,
            accountReference: orderId,
            transactionDesc: `Payment for ${orderId}`,
        });

        return json({
            success: true,
            checkoutRequestId: result.CheckoutRequestID,
            message: result.CustomerMessage,
        });
    } catch (error) {
        return json({
            success: false,
            error: (error as Error).message,
        }, { status: 500 });
    }
};

export default function PayRoute() {
    const actionData = useActionData<typeof action>();

    return (
        <Form method= "post" >
        <input type="text" name = "phoneNumber" placeholder = "0712345678" required />
            <input type="number" name = "amount" placeholder = "10" required />
                <input type="hidden" name = "orderId" value = "order_123" />

                    <button type="submit" > Pay with M - Pesa </button>

            {
        actionData?.success && (
            <p>Please check your phone: { actionData.message } </p>
            )
    }

    {
        actionData?.error && (
            <p style={ { color: 'red' } }> Error: { actionData.error } </p>
            )
    }
    </Form>
    );
}

// ─── app/routes/callback.ts ────────────────────────────────

import type { ActionFunctionArgs } from '@remix-run/node';
import type { StkCallbackPayload } from 'mpesa-ke/types';
import { json } from '@remix-run/node';

export const action = async ({ request }: ActionFunctionArgs) => {
    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, { status: 405 });
    }

    try {
        const payload = await request.json() as StkCallbackPayload;
        const callbackData = payload.Body.stkCallback;

        if (callbackData.ResultCode === 0) {
            console.log('✅ Payment successful!');

            const meta = callbackData.CallbackMetadata?.Item || [];
            const amount = meta.find(item => item.Name === 'Amount')?.Value;
            const receipt = meta.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            const phone = meta.find(item => item.Name === 'PhoneNumber')?.Value;

            console.log('  Receipt:', receipt, 'Amount:', amount, 'Phone:', phone);

            // TODO: Update database
        } else {
            console.log('❌ Payment failed:', callbackData.ResultDesc);
        }

        return json({
            ResultCode: 0,
            ResultDesc: "Success"
        });
    } catch (error) {
        console.error('Callback error:', error);
        return json({
            ResultCode: 1,
            ResultDesc: "Failed to process callback"
        }, { status: 500 });
    }
};
