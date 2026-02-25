/**
 * Express STK Push + Callback Example
 *
 * A complete Express server that:
 * 1. Initiates an STK push
 * 2. Handles the callback from Safaricom
 */

import express from 'express';
import { Mpesa } from 'mpesa-ke';
import { createStkCallbackHandler } from 'mpesa-ke/express';

const app = express();
app.use(express.json());

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
app.post('/pay', async (req, res) => {
    try {
        const { phoneNumber, amount, orderId } = req.body;

        const result = await mpesa.stkPush({
            phoneNumber,
            amount,
            accountReference: orderId,
            transactionDesc: `Payment for ${orderId}`,
        });

        res.json({
            success: true,
            checkoutRequestId: result.CheckoutRequestID,
            message: result.CustomerMessage,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

// ─── Handle M-Pesa Callback ────────────────────────────────
app.post('/mpesa/callback', createStkCallbackHandler({
    onResult: async (result) => {
        if (result.success) {
            console.log('✅ Payment received!');
            console.log('  Receipt:', result.mpesaReceiptNumber);
            console.log('  Amount:', result.amount);
            console.log('  Phone:', result.phoneNumber);

            // TODO: Update your database
            // await Order.updateOne(
            //   { checkoutId: result.checkoutRequestId },
            //   { status: 'paid', receipt: result.mpesaReceiptNumber }
            // );
        } else {
            console.log('❌ Payment failed:', result.resultDesc);
        }
    },
    onError: (error) => {
        console.error('Callback error:', error);
    },
}));

// ─── Query Payment Status ──────────────────────────────────
app.get('/payment-status/:checkoutRequestId', async (req, res) => {
    try {
        const result = await mpesa.stkQuery({
            checkoutRequestId: req.params.checkoutRequestId,
        });

        res.json({
            success: result.ResultCode === '0',
            resultCode: result.ResultCode,
            resultDesc: result.ResultDesc,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

app.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000');
});
