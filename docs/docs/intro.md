---
sidebar_position: 1
---

# Getting Started

Let's get **mpesa-ke** installed and running!

## Installation

Install the package using your favorite package manager:

```bash npm2yarn
npm install mpesa-ke
```

## Basic Setup

Initialize the client with your credentials from the Safaricom Daraja Portal.

```typescript
import { Mpesa } from 'mpesa-ke';

// 1. Initialize the client
const mpesa = new Mpesa({
    consumerKey: "YOUR_CONSUMER_KEY",
    consumerSecret: "YOUR_CONSUMER_SECRET",
    businessShortCode: "174379",
    passKey: "YOUR_PASSKEY",
    environment: "sandbox", 
    callbackUrl: "https://yourdomain.com/mpesa/callback",
});

// 2. Make an API call
const response = await mpesa.stkPush({
    phoneNumber: "0712345678",
    amount: 1,
    accountReference: "Order123",
    transactionDesc: "Test Payment",
});

console.log(response.CheckoutRequestID);
```

## Configuration Options

When creating a new `Mpesa` instance, the following configuration object properties are accepted:

| Option | Type | Required | Description |
|---|---|---|---|
| `consumerKey` | string | Yes | Safaricom App Consumer Key |
| `consumerSecret` | string | Yes | Safaricom App Consumer Secret |
| `businessShortCode` | string | Yes | Paybill or Till Number |
| `passKey` | string | Yes | STK Push Passkey |
| `callbackUrl` | string | Yes | Default callback URL for webhooks |
| `environment` | 'sandbox' \| 'production' | No | Environment (default: 'sandbox') |
| `initiatorName` | string | No | Operator username (for B2B/B2C) |
| `initiatorPassword` | string | No | Operator password (for B2B/B2C) |
| `certificatePath` | string | No | Path to Safaricom cert (production) |
| `debug` | boolean | No | Enable request logging |
| `retries` | number | No | Auto-retry on 5xx errors |
