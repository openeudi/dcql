import { describe, it, expect } from 'vitest';

import { DcqlValidationError, DcqlMatchError } from '../src/errors.js';

describe('errors', () => {
    it('DcqlValidationError carries code and path', () => {
        const err = new DcqlValidationError('missing field "credentials"', 'missing_field', '/credentials');
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(DcqlValidationError);
        expect(err.code).toBe('missing_field');
        expect(err.path).toBe('/credentials');
        expect(err.message).toBe('missing field "credentials"');
        expect(err.name).toBe('DcqlValidationError');
    });

    it('DcqlMatchError has fixed code "unsatisfied_query"', () => {
        const err = new DcqlMatchError('cannot build submission from unsatisfied result');
        expect(err).toBeInstanceOf(DcqlMatchError);
        expect(err.code).toBe('unsatisfied_query');
        expect(err.name).toBe('DcqlMatchError');
    });

    it('DcqlValidationError accepts every defined code', () => {
        const codes = [
            'missing_field',
            'invalid_type',
            'duplicate_id',
            'unknown_format',
            'invalid_claim_path',
            'invalid_claim_set_reference',
            'invalid_credential_set_reference',
        ] as const;
        for (const code of codes) {
            const err = new DcqlValidationError('msg', code, '/foo');
            expect(err.code).toBe(code);
        }
    });
});
