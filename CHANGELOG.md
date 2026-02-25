# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-02-25

### Added
- **B2B Payment** — `mpesa.b2bPayment()` for business-to-business transfers
- **Dynamic QR Code** — `mpesa.dynamicQR()` to generate M-Pesa payment QR codes
- **C2B Simulate** — `mpesa.c2bSimulate()` for sandbox testing without real money
- **Tax Remittance** — `mpesa.taxRemittance()` for KRA tax payments
- **Security Credential Encryption** — `generateSecurityCredential()` auto-encrypts initiator password with Safaricom cert (critical for production B2C/B2B)
- **Retry Logic** — Configurable retry with exponential backoff via `retries` config option
- **Debug Mode** — Set `debug: true` to log all API requests and responses
- **Webhook IP Verification** — `verifyWebhookIp()` helper to validate callbacks from Safaricom
- **GitHub Actions CI** — Automated testing on Node 18, 20, 22
- **CHANGELOG.md** — This file

### Changed
- `MpesaConfig` now supports `initiatorName`, `initiatorPassword`, `certificatePath`, `debug`, and `retries`
- B2C, Balance, Status, and Reversal methods now auto-encrypt credentials when `initiatorPassword` is set
- `createMpesa()` reads additional env vars: `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD`, `MPESA_CERTIFICATE_PATH`, `MPESA_DEBUG`, `MPESA_RETRIES`

## [1.0.0] - 2026-02-25

### Added
- Initial release
- STK Push (Lipa Na M-Pesa Online)
- STK Push Query
- C2B Register URL
- B2C Payment
- Account Balance Query
- Transaction Status Query
- Transaction Reversal
- Express/Fastify callback handlers
- Next.js App Router route handlers
- Auto phone number formatting
- Token caching with auto-refresh
- Typed error classes
- Full TypeScript types
