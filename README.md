<div align="center">

# 🇰🇪 mpesa-ke

**The simplest M-Pesa SDK for JavaScript & TypeScript.**

STK Push, C2B, B2C, and more — zero dependencies, works everywhere.

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://typescriptlang.org)

</div>

---

## Why mpesa-ke?

| Feature | mpesa-ke | Others |
|---|---|---|
| **Zero dependencies** | ✅ Native `fetch()` | ❌ Axios, request, etc. |
| **TypeScript first** | ✅ Full types | ⚠️ Partial or none |
| **All Daraja APIs** | ✅ STK, C2B, B2C, B2B, QR, Tax, Balance, Status, Reversal | ⚠️ Usually STK only |
| **Framework helpers** | ✅ Next.js & Express | ❌ DIY |
| **Retry & Debug** | ✅ Built-in retry + debug logging | ❌ DIY |
| **Security Credentials** | ✅ Auto-encrypts with Safaricom cert | ❌ Manual OpenSSL |
| **5-minute setup** | ✅ Install → configure → done | ❌ Hours of setup |

## Quick Start

### Install

```bash
npm install mpesa-ke
```

### Your First STK Push (5 lines)

```typescript
import { Mpesa } from 'mpesa-ke';

const mpesa = new Mpesa({
  consumerKey: 'your_consumer_key',
  consumerSecret: 'your_consumer_secret',
  businessShortCode: '174379',
  passKey: 'your_passkey',
  environment: 'sandbox',
  callbackUrl: 'https://yourdomain.com/callback',
});

const result = await mpesa.stkPush({
  phoneNumber: '0712345678',
  amount: 100,
  accountReference: 'Order123',
  transactionDesc: 'Payment for order',
});

console.log('Check your phone! ID:', result.CheckoutRequestID);
```

### Using Environment Variables

```typescript
import { createMpesa } from 'mpesa-ke';

// Reads from MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, etc.
const mpesa = createMpesa();
```

## API Reference

### `new Mpesa(config)`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `consumerKey` | `string` | ✅ | OAuth Consumer Key from [Daraja](https://developer.safaricom.co.ke) |
| `consumerSecret` | `string` | ✅ | OAuth Consumer Secret |
| `businessShortCode` | `string` | ✅ | Your Paybill or Till number |
| `passKey` | `string` | ✅ | Lipa Na M-Pesa Online Passkey |
| `environment` | `'sandbox' \| 'production'` | ✅ | API environment |
| `callbackUrl` | `string` | ✅ | Default URL for async results |
| `timeout` | `number` | ❌ | Request timeout in ms (default: 30000) |
| `initiatorName` | `string` | ❌ | Initiator name for B2C/B2B operations |
| `initiatorPassword` | `string` | ❌ | Initiator password (auto-encrypted) |
| `certificatePath` | `string` | ❌ | Path to Safaricom production cert |
| `debug` | `boolean` | ❌ | Log all API requests (default: false) |
| `retries` | `number` | ❌ | Retry on 5xx errors (default: 0) |

---

### `mpesa.stkPush(request)` — Lipa Na M-Pesa Online

Send a payment prompt to the customer's phone.

```typescript
const result = await mpesa.stkPush({
  phoneNumber: '0712345678',    // Any Kenyan format works
  amount: 100,                   // KES (whole numbers)
  accountReference: 'Order123',  // Max 12 chars
  transactionDesc: 'Payment',   // Max 13 chars
  callbackUrl: 'https://...',   // Optional override
});
```

**Returns:** `{ MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription, CustomerMessage }`

---

### `mpesa.stkQuery(request)` — Query STK Status

Check if a customer completed the STK push payment.

```typescript
const status = await mpesa.stkQuery({
  checkoutRequestId: result.CheckoutRequestID,
});

if (status.ResultCode === '0') {
  console.log('Payment successful!');
}
```

---

### `mpesa.c2bRegisterUrl(request)` — Register C2B URLs

Tell M-Pesa where to send payment confirmations.

```typescript
await mpesa.c2bRegisterUrl({
  validationUrl: 'https://yourdomain.com/mpesa/validate',
  confirmationUrl: 'https://yourdomain.com/mpesa/confirm',
  responseType: 'Completed',
});
```

---

### `mpesa.b2cPayment(request)` — Send Money to Customer

```typescript
await mpesa.b2cPayment({
  phoneNumber: '0712345678',
  amount: 500,
  commandId: 'BusinessPayment',
  remarks: 'Refund for order #123',
});
```

---

### `mpesa.accountBalance()` — Query Account Balance

```typescript
const balance = await mpesa.accountBalance();
```

---

### `mpesa.transactionStatus(request)` — Query Transaction

```typescript
const status = await mpesa.transactionStatus({
  transactionId: 'OEI2AK4Q16',
});
```

---

### `mpesa.reversal(request)` — Reverse Transaction

```typescript
await mpesa.reversal({
  transactionId: 'OEI2AK4Q16',
  amount: 100,
  remarks: 'Wrong transaction',
});
```

---

### `mpesa.b2bPayment(request)` — Business to Business

```typescript
await mpesa.b2bPayment({
  receiverShortCode: '600000',
  amount: 1000,
  commandId: 'BusinessPayBill',
  accountReference: 'INV001',
  remarks: 'Payment for services',
});
```

---

### `mpesa.dynamicQR(request)` — Generate QR Code

```typescript
const result = await mpesa.dynamicQR({
  merchantName: 'My Shop',
  refNo: 'Order123',
  amount: 500,
  transactionType: 'BG', // Buy Goods
  creditPartyIdentifier: '174379',
});
console.log(result.QRCode); // Base64-encoded QR image
```

---

### `mpesa.c2bSimulate(request)` — Simulate C2B (Sandbox)

Test your C2B callbacks without real money:

```typescript
await mpesa.c2bSimulate({
  amount: 100,
  phoneNumber: '0712345678',
  billRefNumber: 'Test001',
});
```

---

### `mpesa.taxRemittance(request)` — Tax Payment (KRA)

```typescript
await mpesa.taxRemittance({
  amount: 5000,
  accountReference: 'KRA_PIN',
  receiverShortCode: '572572',
  remarks: 'Tax remittance',
});
```

## Security Credentials

For B2C, B2B, Account Balance, Transaction Status, and Reversal APIs, Safaricom requires an encrypted security credential. mpesa-ke handles this automatically:

```typescript
const mpesa = new Mpesa({
  // ... other config
  initiatorName: 'testapi',
  initiatorPassword: 'your_password',
  // For production, provide the cert path:
  // certificatePath: './certs/production.cer',
});

// Now B2C/B2B calls auto-encrypt the credential:
await mpesa.b2cPayment({ phoneNumber: '0712345678', amount: 500 });
```

## Retry & Debug Mode

```typescript
const mpesa = new Mpesa({
  // ... other config
  retries: 3,    // Retry up to 3 times on 5xx errors (exponential backoff)
  debug: true,   // Log all API requests and responses
});
```

## Framework Integrations

### Next.js (App Router)

Handle M-Pesa callbacks with one line:

```typescript
// app/api/mpesa/callback/route.ts
import { createStkCallbackRoute } from 'mpesa-ke/nextjs';

export const POST = createStkCallbackRoute({
  onResult: async (result) => {
    if (result.success) {
      // Payment successful — update your database
      console.log('Receipt:', result.mpesaReceiptNumber);
      console.log('Amount:', result.amount);
      console.log('Phone:', result.phoneNumber);
    }
  },
});
```

### Express / Fastify

```typescript
import express from 'express';
import { createStkCallbackHandler } from 'mpesa-ke/express';

const app = express();
app.use(express.json());

app.post('/mpesa/callback', createStkCallbackHandler({
  onResult: async (result) => {
    if (result.success) {
      console.log('Payment received!', result.mpesaReceiptNumber);
    }
  },
}));
```

### Parse Callbacks Manually

If you need full control:

```typescript
import { parseStkCallback } from 'mpesa-ke';

// In any handler
const result = parseStkCallback(requestBody);
console.log(result.success);          // boolean
console.log(result.mpesaReceiptNumber); // string | null
console.log(result.amount);           // number | null
console.log(result.phoneNumber);      // string | null
```

## Phone Number Handling

mpesa-ke automatically formats Kenyan phone numbers. All these work:

```typescript
mpesa.stkPush({ phoneNumber: '0712345678', ... });     // ✅
mpesa.stkPush({ phoneNumber: '+254712345678', ... });   // ✅
mpesa.stkPush({ phoneNumber: '254712345678', ... });    // ✅
mpesa.stkPush({ phoneNumber: '712345678', ... });       // ✅
mpesa.stkPush({ phoneNumber: '0712-345-678', ... });    // ✅
```

## Error Handling

mpesa-ke throws typed errors for easy handling:

```typescript
import { MpesaAuthError, MpesaApiError, MpesaValidationError } from 'mpesa-ke';

try {
  await mpesa.stkPush({ ... });
} catch (error) {
  if (error instanceof MpesaValidationError) {
    // Invalid input (bad phone number, missing field, etc.)
    console.log('Field:', error.field);
  } else if (error instanceof MpesaAuthError) {
    // Authentication failed (bad keys)
    console.log('Status:', error.statusCode);
  } else if (error instanceof MpesaApiError) {
    // Safaricom API error
    console.log('Error code:', error.errorCode);
    console.log('Response:', error.response);
  }
}
```

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `MPESA_CONSUMER_KEY` | OAuth Consumer Key | ✅ |
| `MPESA_CONSUMER_SECRET` | OAuth Consumer Secret | ✅ |
| `MPESA_BUSINESS_SHORTCODE` | Paybill / Till number | ✅ |
| `MPESA_PASSKEY` | STK Push passkey | ✅ |
| `MPESA_ENVIRONMENT` | `sandbox` or `production` | ❌ (default: `sandbox`) |
| `MPESA_CALLBACK_URL` | Callback URL for results | ✅ |
| `MPESA_INITIATOR_NAME` | Initiator for B2C/B2B | ❌ |
| `MPESA_INITIATOR_PASSWORD` | Auto-encrypted credential | ❌ |
| `MPESA_CERTIFICATE_PATH` | Path to production cert | ❌ |
| `MPESA_DEBUG` | Set `true` for debug logs | ❌ |
| `MPESA_RETRIES` | Retry count (default: 0) | ❌ |

## Getting Safaricom API Credentials

1. Go to [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create an account and log in
3. Create a new app and get your **Consumer Key** and **Consumer Secret**
4. For STK Push, use the test credentials:
   - Shortcode: `174379`
   - Passkey: `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`
5. For production, go through the Safaricom [Go Live](https://developer.safaricom.co.ke/Documentation) process

## Requirements

- **Node.js 18+** (uses native `fetch()`)
- Works with: Node.js, Bun, Deno, Cloudflare Workers

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) © Onyango Don Omondi

---

<div align="center">

**Built with ❤️ in Kenya 🇰🇪**

If this saved you time, give it a ⭐ on [GitHub](https://github.com/onyangodonomondi/mpesa-ke)!

</div>
