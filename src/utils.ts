// ─────────────────────────────────────────────────────────────
//  mpesa-ke — Utility Functions
//  Pure functions for phone formatting, timestamps, passwords
// ─────────────────────────────────────────────────────────────

/**
 * Format a Kenyan phone number to 254XXXXXXXXX format.
 *
 * Accepts:
 * - `0712345678`  → `254712345678`
 * - `+254712345678` → `254712345678`
 * - `254712345678` → `254712345678`
 * - `712345678` → `254712345678`
 *
 * @throws {Error} If the resulting number is not 12 digits
 */
export function formatPhoneNumber(phone: string): string {
    // Strip everything that isn't a digit
    let cleaned = phone.replace(/\D/g, '');

    // Remove leading + (already stripped by regex above, but just in case)
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
    } else if (!cleaned.startsWith('254')) {
        cleaned = '254' + cleaned;
    }

    if (cleaned.length !== 12) {
        throw new Error(
            `Invalid phone number "${phone}": expected 12 digits after formatting, got ${cleaned.length} (${cleaned})`
        );
    }

    return cleaned;
}

/**
 * Generate a timestamp in YYYYMMDDHHMMSS format.
 * Used by the Daraja API for STK push requests.
 */
export function generateTimestamp(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Generate the STK push password.
 * Formula: Base64(BusinessShortCode + PassKey + Timestamp)
 */
export function generatePassword(
    businessShortCode: string,
    passKey: string,
    timestamp: string
): string {
    const data = `${businessShortCode}${passKey}${timestamp}`;
    return Buffer.from(data).toString('base64');
}

/**
 * Parse a Safaricom date number (YYYYMMDDHHmmss) into a JS Date.
 *
 * @example
 * parseSafaricomDate('20260225120000') // → Date(2026-02-25T12:00:00)
 * parseSafaricomDate(20260225120000)   // → Date(2026-02-25T12:00:00)
 */
export function parseSafaricomDate(dateValue: string | number): Date {
    const s = String(dateValue);
    return new Date(
        parseInt(s.substring(0, 4)),
        parseInt(s.substring(4, 6)) - 1,
        parseInt(s.substring(6, 8)),
        parseInt(s.substring(8, 10)),
        parseInt(s.substring(10, 12)),
        parseInt(s.substring(12, 14))
    );
}

/**
 * Generate an encrypted security credential for B2C/B2B/Balance/Status APIs.
 *
 * In production, you MUST provide the Safaricom production certificate path.
 * In sandbox, the built-in sandbox certificate is used by default.
 *
 * @param password - The initiator password to encrypt
 * @param certificatePath - Optional path to Safaricom's public certificate (.cer file)
 * @returns Base64-encoded encrypted credential
 */
export function generateSecurityCredential(
    password: string,
    certificatePath?: string
): string {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const crypto = require('crypto') as typeof import('crypto');
    const fs = require('fs') as typeof import('fs');

    let certificate: string;

    if (certificatePath) {
        certificate = fs.readFileSync(certificatePath, 'utf8');
    } else {
        certificate = SANDBOX_CERTIFICATE;
    }

    const encrypted = crypto.publicEncrypt(
        {
            key: certificate,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        Buffer.from(password)
    );

    return encrypted.toString('base64');
}

/**
 * Verify if a request IP is from Safaricom's M-Pesa servers.
 *
 * @param ip - The client IP address to check
 * @returns true if the IP matches known Safaricom ranges
 */
export function verifyWebhookIp(ip: string): boolean {
    return SAFARICOM_IP_PREFIXES.some(prefix => ip.startsWith(prefix));
}

/** Known Safaricom M-Pesa IP prefixes */
const SAFARICOM_IP_PREFIXES = [
    '196.201.214.',
    '196.201.212.',
    '196.201.213.',
    '41.215.130.',
];

/**
 * Safaricom Daraja API sandbox certificate (for credential encryption).
 * For production, download the cert from the Daraja portal.
 */
const SANDBOX_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIGkzCCBXugAwIBAgIKXfBp5gAAADU/ODANBgkqhkiG9w0BAQsFADBbMRMwEQYK
CZImiZPyLGQBGRYDbmV0MRkwFwYKCZImiZPyLGQBGRYJc2FmYXJpY29tMSkwJwYD
VQQDEyBTYWZhcmljb20gSW50ZXJuYWwgSXNzdWluZyBDQSAwMjAeFw0xNzA0MjUx
NjA3MjRaFw0xOTA0MjUxNjA3MjRaMIGNMQswCQYDVQQGEwJLRTEQMA4GA1UECBMH
TmFpcm9iaTEQMA4GA1UEBxMHTmFpcm9iaTEaMBgGA1UEChMRU2FmYXJpY29tIExp
bWl0ZWQxEzARBgNVBAsTClRlY2hub2xvZ3kxKTAnBgNVBAMTIGFwaWdlZS5hcGlj
YWxsZXIuc2FmYXJpY29tLmNvLmtlMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAoknIb5Tm1hxOVdFsOejAs6veAai32K7ZkJOCkS1Ka5KGgIF21bv1PMMK
Rj3J6DSXVITMjPQSPVVL1YkFHMOCJIqI4oBSmTNaGzieiwkbYRa1ijZOrRaGcy4A
gJ7VKfIHl4T2pGU2V00JZAIVOOgLNnJOIVzEh1SZGJLlCmlNakJE2bbZDrv1BS5O
c4/VhDyDaSqiHxBSmTPKkjaCC8i9r8VfVD5n3C6BbEULNuBDMHEN5xNP/jQ1bv0I
q2fgR9FoFvh0sJFqhiPIU5jmBiP1Dq0eXbLvBvpbvYVZ3uORDW0lhDQSeFPnEXM
bgm/nz1hJPEb+wGTV/KxHqFY6xdfgQIDAQABo4IDJDCCAyAwHQYDVR0OBBYEFL9+
EGBcM/Kt+3GUjGsmqXmdb2goMB8GA1UdIwQYMBaAFCy0EYDyMnJv94tFyAfhmXAz
SxAdMIIBOwYDVR0fBIIBMjCCAS4wggEqoIIBJqCCASKGgdZsZGFwOi8vL0NOPVNh
ZmFyaWNvbSUyMEludGVybmFsJTIwSXNzdWluZyUyMENBJTIwMDIsQ049U1ZSTFNB
RkNBMDIuQ049Q0RQLENOPVB1YmxpYyUyMEtleSUyMFNlcnZpY2VzLENOPVNlcnZp
Y2VzLENOPUNvbmZpZ3VyYXRpb24sREM9c2FmYXJpY29tLERDPW5ldD9jZXJ0aWZp
Y2F0ZVJldm9jYXRpb25MaXN0P2Jhc2U/b2JqZWN0Q2xhc3M9Y1JMRGlzdHJpYnV0
aW9uUG9pbnSGR2h0dHA6Ly9jcmwuc2FmYXJpY29tLmNvLmtlL1NhZmFyaWNvbSUy
MEludGVybmFsJTIwSXNzdWluZyUyMENBJTIwMDIuY3JsMIIBLgYIKwYBBQUHAQEE
ggEgMIIBHDCBzAYIKwYBBQUHMAKGgb9sZGFwOi8vL0NOPVNhZmFyaWNvbSUyMElu
dGVybmFsJTIwSXNzdWluZyUyMENBJTIwMDIsQ049QUlBLENOPVB1YmxpYyUyMEtl
eSUyMFNlcnZpY2VzLENOPVNlcnZpY2VzLENOPUNvbmZpZ3VyYXRpb24sREM9c2Fm
YXJpY29tLERDPW5ldD9jQUNlcnRpZmljYXRlP2Jhc2U/b2JqZWN0Q2xhc3M9Y2Vy
dGlmaWNhdGlvbkF1dGhvcml0eTBLBggrBgEFBQcwAoY/aHR0cDovL2NybC5zYWZh
cmljb20uY28ua2UvU2FmYXJpY29tJTIwSW50ZXJuYWwlMjBJc3N1aW5nJTIwQ0Eu
Y3J0MAsGA1UdDwQEAwIFoDA9BgkrBgEEAYI3FQcEMDAuBiYrBgEEAYI3FQiHz4Rh
gZKNSIeanQqBiemFG4HYnQd2gYLiEQIBZAIBDTAdBgNVHSUEFjAUBggrBgEFBQcD
AQYIKwYBBQUHAwIwJwYJKwYBBAGCNxUKBBowGDAKBggrBgEFBQcDATAKBggrBgEF
BQcDAjANBgkqhkiG9w0BAQsFAAOCAQEAjjBpMhrikCwsGvXEC8ApFW9HJjFBIk/p
aMaE7PSG1sHaZPMriDTz8GiH0uoSp6j0/NikvOfkQhQHPPUVH8k2d7X5Rymqixau
5v7qEN1UBRrJvJZxUmJaGhpv8N3SbczH/j4+iVY8Fk/UJYIFt00g2e10h5uKZXSd
Qfm/JAB7WPjMzIr6LxUqZjNTsIVvJmN3TlEB0yPz1EGiZCGlrL5WSFS/XvK+/vB
TY28TGfN+iA8z5NW8MH2JB8JUL2S+JvJT8J2fPKxL9U6/1DOz7GM7NUxevHQkSnx
F2Ci/e5dMIZXrlr0iLkaSj67LMF8bL7F8A9+2dV9SNKZ12C32BI5wQ==
-----END CERTIFICATE-----`;
