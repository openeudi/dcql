import { describe, it, expect } from 'vitest';

import { DcqlValidationError } from '../src/errors.js';
import { validateQuery } from '../src/validate/query.js';

describe('validateQuery — top-level shape', () => {
    it('accepts a minimum valid query', () => {
        const input = { credentials: [{ id: 'c1', format: 'dc+sd-jwt' }] };
        const result = validateQuery(input);
        expect(result.credentials).toHaveLength(1);
    });

    it('rejects non-object input', () => {
        expect(() => validateQuery(null)).toThrow(DcqlValidationError);
        expect(() => validateQuery('string')).toThrow(DcqlValidationError);
        expect(() => validateQuery(42)).toThrow(DcqlValidationError);
        expect(() => validateQuery([])).toThrow(DcqlValidationError);
    });

    it('rejects missing credentials field', () => {
        const err = captureError(() => validateQuery({}));
        expect(err.code).toBe('missing_field');
        expect(err.path).toBe('/credentials');
    });

    it('rejects empty credentials array', () => {
        const err = captureError(() => validateQuery({ credentials: [] }));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toBe('/credentials');
    });

    it('rejects non-array credentials', () => {
        const err = captureError(() => validateQuery({ credentials: 'nope' }));
        expect(err.code).toBe('invalid_type');
    });

    it('rejects duplicate credential ids', () => {
        const input = {
            credentials: [
                { id: 'c1', format: 'dc+sd-jwt' },
                { id: 'c1', format: 'mso_mdoc' },
            ],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('duplicate_id');
        expect(err.path).toBe('/credentials/1/id');
    });

    it('rejects credential entry if not an object', () => {
        const err = captureError(() => validateQuery({ credentials: ['not-object'] }));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('credentials');
    });
});

describe('validateQuery — CredentialQuery shape', () => {
    it('rejects missing id', () => {
        const err = captureError(() => validateQuery({ credentials: [{ format: 'dc+sd-jwt' }] }));
        expect(err.code).toBe('missing_field');
        expect(err.path).toBe('/credentials/0/id');
    });

    it('rejects missing format', () => {
        const err = captureError(() => validateQuery({ credentials: [{ id: 'c1' }] }));
        expect(err.code).toBe('missing_field');
        expect(err.path).toBe('/credentials/0/format');
    });

    it('rejects non-string id', () => {
        const err = captureError(() => validateQuery({ credentials: [{ id: 42, format: 'dc+sd-jwt' }] }));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toBe('/credentials/0/id');
    });

    it('accepts meta with vct_values for sd-jwt-vc', () => {
        const input = {
            credentials: [
                {
                    id: 'pid',
                    format: 'dc+sd-jwt',
                    meta: { vct_values: ['urn:eu.europa.ec.eudi:pid:1'] },
                },
            ],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('accepts meta with doctype_value for mdoc', () => {
        const input = {
            credentials: [
                {
                    id: 'mdl',
                    format: 'mso_mdoc',
                    meta: { doctype_value: 'org.iso.18013.5.1.mDL' },
                },
            ],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('rejects non-string format', () => {
        const err = captureError(() => validateQuery({ credentials: [{ id: 'c1', format: 123 }] }));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('format');
    });

    it('accepts require_cryptographic_holder_binding=true', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    require_cryptographic_holder_binding: true,
                },
            ],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('rejects require_cryptographic_holder_binding if not boolean', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    require_cryptographic_holder_binding: 'yes',
                },
            ],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('require_cryptographic_holder_binding');
    });

    it('accepts multiple=true', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    multiple: true,
                },
            ],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('rejects multiple if not boolean', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    multiple: 'yes',
                },
            ],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('multiple');
    });

    it('rejects meta if not an object', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    meta: 'not-object',
                },
            ],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('meta');
    });

    it('rejects vct_values if not array of strings', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    meta: { vct_values: [123] },
                },
            ],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('vct_values');
    });

    it('rejects doctype_value if not a string', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'mso_mdoc',
                    meta: { doctype_value: 123 },
                },
            ],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('doctype_value');
    });
});

describe('validateQuery — ClaimsQuery', () => {
    it('accepts claims with string-only path', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', claims: [{ path: ['family_name'] }] }],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('accepts claims with mixed path segments', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    claims: [{ id: 'addr-city', path: ['addresses', 0, null, 'city'] }],
                },
            ],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('rejects claims with empty path', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', claims: [{ path: [] }] }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_claim_path');
        expect(err.path).toBe('/credentials/0/claims/0/path');
    });

    it('rejects claims with invalid path segment type', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', claims: [{ path: [true] }] }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_claim_path');
    });

    it('rejects claims with non-primitive values', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    claims: [{ path: ['age'], values: [{ nested: 'bad' }] }],
                },
            ],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('values');
    });

    it('rejects claims if values is not an array', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    claims: [{ path: ['age'], values: 'not-array' }],
                },
            ],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('values');
    });

    it('accepts claims with id and string values', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    claims: [{ id: 'age', path: ['age'], values: ['18', '21', '25'] }],
                },
            ],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('accepts claims with numeric values', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    claims: [{ path: ['age'], values: [18, 21, 25] }],
                },
            ],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('accepts claims with boolean values', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    claims: [{ path: ['age_over_18'], values: [true, false] }],
                },
            ],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('rejects claims with invalid value type (null)', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    claims: [{ path: ['field'], values: [null] }],
                },
            ],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('values');
    });

    it('rejects claims with invalid value type (array)', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    claims: [{ path: ['field'], values: [[1, 2]] }],
                },
            ],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
    });

    it('rejects claims if not an array', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', claims: { path: ['family_name'] } }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('claims');
    });

    it('rejects individual claim if not an object', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', claims: ['not-object'] }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
    });

    it('rejects claim with invalid id type', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', claims: [{ id: 42, path: ['family_name'] }] }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('id');
    });

    it('rejects path if not an array', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', claims: [{ path: 'family_name' }] }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_claim_path');
    });
});

describe('validateQuery — cross-references', () => {
    it('accepts claim_sets referencing existing claim ids', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    claims: [
                        { id: 'fn', path: ['family_name'] },
                        { id: 'dob', path: ['birthdate'] },
                    ],
                    claim_sets: [['fn', 'dob']],
                },
            ],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('rejects claim_sets referencing unknown claim id', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    claims: [{ id: 'fn', path: ['family_name'] }],
                    claim_sets: [['fn', 'unknown_id']],
                },
            ],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_claim_set_reference');
        expect(err.path).toBe('/credentials/0/claim_sets/0/1');
    });

    it('accepts credential_sets referencing existing credential ids', () => {
        const input = {
            credentials: [
                { id: 'c1', format: 'dc+sd-jwt' },
                { id: 'c2', format: 'mso_mdoc' },
            ],
            credential_sets: [{ options: [['c1'], ['c2']], required: true }],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('rejects credential_sets referencing unknown credential id', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt' }],
            credential_sets: [{ options: [['c1', 'missing']] }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_credential_set_reference');
        expect(err.path).toBe('/credential_sets/0/options/0/1');
    });

    it('rejects credential_sets with empty options', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt' }],
            credential_sets: [{ options: [] }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toBe('/credential_sets/0/options');
    });

    it('rejects claim_sets with non-array entry', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    claims: [{ id: 'fn', path: ['family_name'] }],
                    claim_sets: ['not-array'],
                },
            ],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('claim_sets');
    });

    it('rejects credential_set entry that is not an object', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt' }],
            credential_sets: ['not-object'],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('credential_sets');
    });

    it('rejects credential_sets with non-array option', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt' }],
            credential_sets: [{ options: [{ not: 'array' }] }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('credential_sets');
    });

    it('accepts credential_set with required=false', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt' }],
            credential_sets: [{ options: [['c1']], required: false }],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('rejects credential_set with invalid required type', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt' }],
            credential_sets: [{ options: [['c1']], required: 'yes' }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('required');
    });

    it('rejects credential_sets if not an array', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt' }],
            credential_sets: { options: [['c1']] },
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toBe('/credential_sets');
    });
});

function captureError(fn: () => unknown): DcqlValidationError {
    try {
        fn();
    } catch (e) {
        if (e instanceof DcqlValidationError) return e;
        throw new Error(`Expected DcqlValidationError, got ${e}`);
    }
    throw new Error('Expected DcqlValidationError to be thrown');
}
