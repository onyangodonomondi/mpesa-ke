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
