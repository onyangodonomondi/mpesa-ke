import { describe, it, expect } from 'vitest';
import { formatPhoneNumber, generateTimestamp, generatePassword, parseSafaricomDate } from '../src/utils';

describe('formatPhoneNumber', () => {
    it('formats 0xxx numbers correctly', () => {
        expect(formatPhoneNumber('0712345678')).toBe('254712345678');
    });

    it('formats +254 numbers correctly', () => {
        expect(formatPhoneNumber('+254712345678')).toBe('254712345678');
    });

    it('passes through 254xxx numbers', () => {
        expect(formatPhoneNumber('254712345678')).toBe('254712345678');
    });

    it('formats short numbers (without country code or leading 0)', () => {
        expect(formatPhoneNumber('712345678')).toBe('254712345678');
    });

    it('handles numbers with spaces and dashes', () => {
        expect(formatPhoneNumber('0712-345-678')).toBe('254712345678');
        expect(formatPhoneNumber('0712 345 678')).toBe('254712345678');
        expect(formatPhoneNumber('+254 712 345 678')).toBe('254712345678');
    });

    it('handles numbers with parentheses', () => {
        expect(formatPhoneNumber('(0712) 345 678')).toBe('254712345678');
    });

    it('throws on invalid length', () => {
        expect(() => formatPhoneNumber('071234')).toThrow('Invalid phone number');
        expect(() => formatPhoneNumber('')).toThrow('Invalid phone number');
    });

    it('works with Safaricom prefixes (07xx, 01xx)', () => {
        expect(formatPhoneNumber('0110123456')).toBe('254110123456');
        expect(formatPhoneNumber('0722123456')).toBe('254722123456');
        expect(formatPhoneNumber('0100123456')).toBe('254100123456');
    });
});

describe('generateTimestamp', () => {
    it('returns 14-character string', () => {
        const ts = generateTimestamp();
        expect(ts).toHaveLength(14);
        expect(ts).toMatch(/^\d{14}$/);
    });

    it('formats a known date correctly', () => {
        const date = new Date(2026, 1, 25, 14, 30, 45); // Feb 25, 2026 14:30:45
        expect(generateTimestamp(date)).toBe('20260225143045');
    });

    it('zero-pads single-digit months and days', () => {
        const date = new Date(2026, 0, 5, 9, 3, 7); // Jan 5, 2026 09:03:07
        expect(generateTimestamp(date)).toBe('20260105090307');
    });
});

describe('generatePassword', () => {
    it('generates correct Base64 password', () => {
        const password = generatePassword('174379', 'bfb279f9', '20260225143045');
        // Base64 of "174379bfb279f920260225143045"
        const expected = Buffer.from('174379bfb279f920260225143045').toString('base64');
        expect(password).toBe(expected);
    });

    it('returns a non-empty string', () => {
        expect(generatePassword('174379', 'testkey', '20260101000000')).toBeTruthy();
    });
});

describe('parseSafaricomDate', () => {
    it('parses a numeric date value', () => {
        const date = parseSafaricomDate(20260225120000);
        expect(date.getFullYear()).toBe(2026);
        expect(date.getMonth()).toBe(1); // February (0-indexed)
        expect(date.getDate()).toBe(25);
        expect(date.getHours()).toBe(12);
        expect(date.getMinutes()).toBe(0);
        expect(date.getSeconds()).toBe(0);
    });

    it('parses a string date value', () => {
        const date = parseSafaricomDate('20261231235959');
        expect(date.getFullYear()).toBe(2026);
        expect(date.getMonth()).toBe(11); // December
        expect(date.getDate()).toBe(31);
        expect(date.getHours()).toBe(23);
        expect(date.getMinutes()).toBe(59);
        expect(date.getSeconds()).toBe(59);
    });
});
