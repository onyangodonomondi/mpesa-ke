/**
 * SvelteKit STK Push + Callback Example
 *
 * This example shows an STK Push integration in SvelteKit:
 * 1. Form Action to initiate STK push
 * 2. API Route to receive payment result (callback)
 *
 * File structure:
 *   src/routes/pay/+page.server.ts     — STK Push action
 *   src/routes/api/callback/+server.ts — Callback handler
 */

// ─── src/routes/pay/+page.server.ts ─────────────────────────

import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { Mpesa } from 'mpesa-ke';

const mpesa = new Mpesa({
    consumerKey: process.env.MPESA_CONSUMER_KEY!,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
    businessShortCode: process.env.MPESA_BUSINESS_SHORTCODE!,
    passKey: process.env.MPESA_PASSKEY!,
    environment: 'sandbox',
    callbackUrl: 'https://yourdomain.com/api/callback',
});

export const actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const phoneNumber = data.get('phoneNumber')?.toString();
        const amount = Number(data.get('amount'));
        const orderId = data.get('orderId')?.toString();

        if (!phoneNumber || !amount || !orderId) {
            return fail(400, { phoneNumber, missing: true });
        }

        try {
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
            return fail(500, {
                success: false,
                error: (error as Error).message,
            });
        }
    }
} satisfies Actions;

/*
<!-- src/routes/pay/+page.svelte -->
<script lang="ts">
    import type { ActionData } from './$types';
    export let form: ActionData;
</script>

<form method="POST">
    <input type="text" name="phoneNumber" placeholder="0712345678" required />
    <input type="number" name="amount" placeholder="10" required />
    <input type="hidden" name="orderId" value="order_123" />
    <button type="submit">Pay with M-Pesa</button>
</form>

{#if form?.success}
    <p>Please check your phone: {form.message}</p>
{/if}
{#if form?.error}
    <p style="color: red;">Error: {form.error}</p>
{/if}
*/

// ─── src/routes/api/callback/+server.ts ─────────────────────

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { StkCallbackPayload } from 'mpesa-ke/types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const payload = await request.json() as StkCallbackPayload;
        const callbackData = payload.Body.stkCallback;

        if (callbackData.ResultCode === 0) {
            console.log('✅ Payment successful!');

            const meta = callbackData.CallbackMetadata?.Item || [];
            const amount = meta.find(item => item.Name === 'Amount')?.Value;
            const receipt = meta.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            const phone = meta.find(item => item.Name === 'PhoneNumber')?.Value;

            console.log('  Receipt:', receipt);
            console.log('  Amount:', amount);
            console.log('  Phone:', phone);

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
