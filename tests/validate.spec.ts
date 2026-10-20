import { describe, it, expect } from 'vitest';

import { DcqlValidationError } from '../src/errors.js';
import { validateQuery } from '../src/validate/query.js';

// OpenID4VP 1.0 §6.1 makes `meta` REQUIRED; B.3.5 / B.2.3 define its per-format members.
const SD_JWT_META = { vct_values: ['urn:eudi:pid:1'] };
const MDOC_META = { doctype_value: 'eu.europa.ec.eudi.pid.1' };

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

/** A random id drawn from the §6.1 charset `[A-Za-z0-9_-]`. */
function randomId(length = 1 + Math.floor(Math.random() * 16)): string {
    let id = '';
    for (let i = 0; i < length; i++) id += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
    return id;
}

/** A random id that contains one character outside the §6.1 charset. */
function randomInvalidId(): string {
    const forbidden = [' ', '.', ':', '/', '#', '@', 'é', '+', '!', '$'];
    const bad = forbidden[Math.floor(Math.random() * forbidden.length)];
    return `${randomId()}${bad}${randomId()}`;
}

describe('validateQuery — top-level shape', () => {
    it('accepts a minimum valid query', () => {
        const input = { credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META }] };
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
                { id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META },
                { id: 'c1', format: 'mso_mdoc', meta: MDOC_META },
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
        const err = captureError(() => validateQuery({ credentials: [{ format: 'dc+sd-jwt', meta: SD_JWT_META }] }));
        expect(err.code).toBe('missing_field');
        expect(err.path).toBe('/credentials/0/id');
    });

    it('rejects missing format', () => {
        const err = captureError(() => validateQuery({ credentials: [{ id: 'c1' }] }));
        expect(err.code).toBe('missing_field');
        expect(err.path).toBe('/credentials/0/format');
    });

    it('rejects non-string id', () => {
        const err = captureError(() => validateQuery({ credentials: [{ id: 42, format: 'dc+sd-jwt', meta: SD_JWT_META }] }));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toBe('/credentials/0/id');
    });

    it('accepts meta with vct_values for sd-jwt-vc', () => {
        const input = {
            credentials: [
                {
                    id: 'pid',
                    format: 'dc+sd-jwt',
                    meta: { vct_values: ['urn:eudi:pid:1'] },
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
                    format: 'dc+sd-jwt', meta: SD_JWT_META,
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
                    format: 'dc+sd-jwt', meta: SD_JWT_META,
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
                    format: 'dc+sd-jwt', meta: SD_JWT_META,
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
                    format: 'dc+sd-jwt', meta: SD_JWT_META,
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
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META, claims: [{ path: ['family_name'] }] }],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('accepts claims with mixed path segments', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt', meta: SD_JWT_META,
                    claims: [{ id: 'addr-city', path: ['addresses', 0, null, 'city'] }],
                },
            ],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('rejects claims with empty path', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META, claims: [{ path: [] }] }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_claim_path');
        expect(err.path).toBe('/credentials/0/claims/0/path');
    });

    it('rejects claims with invalid path segment type', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META, claims: [{ path: [true] }] }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_claim_path');
    });

    it('rejects claims with non-primitive values', () => {
        const input = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt', meta: SD_JWT_META,
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
                    format: 'dc+sd-jwt', meta: SD_JWT_META,
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
                    format: 'dc+sd-jwt', meta: SD_JWT_META,
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
                    format: 'dc+sd-jwt', meta: SD_JWT_META,
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
                    format: 'dc+sd-jwt', meta: SD_JWT_META,
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
                    format: 'dc+sd-jwt', meta: SD_JWT_META,
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
                    format: 'dc+sd-jwt', meta: SD_JWT_META,
                    claims: [{ path: ['field'], values: [[1, 2]] }],
                },
            ],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
    });

    it('rejects claims if not an array', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META, claims: { path: ['family_name'] } }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('claims');
    });

    it('rejects individual claim if not an object', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META, claims: ['not-object'] }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
    });

    it('rejects claim with invalid id type', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META, claims: [{ id: 42, path: ['family_name'] }] }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('id');
    });

    it('rejects path if not an array', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META, claims: [{ path: 'family_name' }] }],
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
                    format: 'dc+sd-jwt', meta: SD_JWT_META,
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
                    format: 'dc+sd-jwt', meta: SD_JWT_META,
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
                { id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META },
                { id: 'c2', format: 'mso_mdoc', meta: MDOC_META },
            ],
            credential_sets: [{ options: [['c1'], ['c2']], required: true }],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('rejects credential_sets referencing unknown credential id', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META }],
            credential_sets: [{ options: [['c1', 'missing']] }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_credential_set_reference');
        expect(err.path).toBe('/credential_sets/0/options/0/1');
    });

    it('rejects credential_sets with empty options', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META }],
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
                    format: 'dc+sd-jwt', meta: SD_JWT_META,
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
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META }],
            credential_sets: ['not-object'],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('credential_sets');
    });

    it('rejects credential_sets with non-array option', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META }],
            credential_sets: [{ options: [{ not: 'array' }] }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('credential_sets');
    });

    it('accepts credential_set with required=false', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META }],
            credential_sets: [{ options: [['c1']], required: false }],
        };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('rejects credential_set with invalid required type', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META }],
            credential_sets: [{ options: [['c1']], required: 'yes' }],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toContain('required');
    });

    it('rejects credential_sets if not an array', () => {
        const input = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META }],
            credential_sets: { options: [['c1']] },
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toBe('/credential_sets');
    });
});

describe('validateQuery — id charset (§6.1, §6.3)', () => {
    it('accepts credential and claim ids drawn from [A-Za-z0-9_-]', () => {
        const credentialId = randomId();
        const claimId = randomId();
        const input = {
            credentials: [
                { id: credentialId, format: 'dc+sd-jwt', meta: SD_JWT_META, claims: [{ id: claimId, path: ['birthdate'] }] },
            ],
        };
        expect(validateQuery(input).credentials[0]?.id).toBe(credentialId);
    });

    it('rejects a credential id with a character outside the charset', () => {
        const err = captureError(() =>
            validateQuery({ credentials: [{ id: randomInvalidId(), format: 'dc+sd-jwt', meta: SD_JWT_META }] })
        );
        expect(err.code).toBe('invalid_id');
        expect(err.path).toBe('/credentials/0/id');
    });

    it('rejects an empty credential id', () => {
        const err = captureError(() => validateQuery({ credentials: [{ id: '', format: 'dc+sd-jwt', meta: SD_JWT_META }] }));
        expect(err.code).toBe('invalid_id');
        expect(err.path).toBe('/credentials/0/id');
    });

    it('rejects a claim id with a character outside the charset', () => {
        const input = {
            credentials: [
                { id: randomId(), format: 'dc+sd-jwt', meta: SD_JWT_META, claims: [{ id: randomInvalidId(), path: ['birthdate'] }] },
            ],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('invalid_id');
        expect(err.path).toBe('/credentials/0/claims/0/id');
    });

    it('rejects a claim id used twice in the same claims array', () => {
        const claimId = randomId();
        const input = {
            credentials: [
                {
                    id: randomId(),
                    format: 'dc+sd-jwt',
                    meta: SD_JWT_META,
                    claims: [
                        { id: claimId, path: ['birthdate'] },
                        { id: claimId, path: ['family_name'] },
                    ],
                },
            ],
        };
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('duplicate_id');
        expect(err.path).toBe('/credentials/0/claims/1/id');
    });
});

describe('validateQuery — format and meta (§6.1, B.2.3, B.3.5)', () => {
    it('rejects an empty format with unknown_format', () => {
        const err = captureError(() => validateQuery({ credentials: [{ id: 'c1', format: '', meta: {} }] }));
        expect(err.code).toBe('unknown_format');
        expect(err.path).toBe('/credentials/0/format');
    });

    it.each(['dc+sd-jwt', 'mso_mdoc', 'jwt_vc_json'])('rejects a %s query without meta', (format) => {
        const err = captureError(() => validateQuery({ credentials: [{ id: 'c1', format }] }));
        expect(err.code).toBe('missing_field');
        expect(err.path).toBe('/credentials/0/meta');
    });

    it('accepts an empty meta object for a format without required meta members', () => {
        const input = { credentials: [{ id: 'c1', format: `x-${randomId()}`, meta: {} }] };
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('rejects dc+sd-jwt meta without vct_values', () => {
        const err = captureError(() => validateQuery({ credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: {} }] }));
        expect(err.code).toBe('missing_field');
        expect(err.path).toBe('/credentials/0/meta/vct_values');
    });

    it('rejects an empty vct_values array', () => {
        const err = captureError(() =>
            validateQuery({ credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: { vct_values: [] } }] })
        );
        expect(err.code).toBe('invalid_type');
        expect(err.path).toBe('/credentials/0/meta/vct_values');
    });

    it('rejects mso_mdoc meta without doctype_value', () => {
        const err = captureError(() => validateQuery({ credentials: [{ id: 'c1', format: 'mso_mdoc', meta: {} }] }));
        expect(err.code).toBe('missing_field');
        expect(err.path).toBe('/credentials/0/meta/doctype_value');
    });

    it('rejects an empty doctype_value', () => {
        const err = captureError(() =>
            validateQuery({ credentials: [{ id: 'c1', format: 'mso_mdoc', meta: { doctype_value: '' } }] })
        );
        expect(err.code).toBe('invalid_type');
        expect(err.path).toBe('/credentials/0/meta/doctype_value');
    });
});

describe('validateQuery — claims rules (§6.3, §6.4.1, §7)', () => {
    const sdJwtQuery = (extra: Record<string, unknown>) => ({
        credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META, ...extra }],
    });
    const mdocQuery = (extra: Record<string, unknown>) => ({
        credentials: [{ id: 'c1', format: 'mso_mdoc', meta: MDOC_META, ...extra }],
    });

    it('rejects an empty claims array', () => {
        const err = captureError(() => validateQuery(sdJwtQuery({ claims: [] })));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toBe('/credentials/0/claims');
    });

    it('rejects an empty values array', () => {
        const err = captureError(() => validateQuery(sdJwtQuery({ claims: [{ path: ['birthdate'], values: [] }] })));
        expect(err.code).toBe('invalid_type');
        expect(err.path).toBe('/credentials/0/claims/0/values');
    });

    it('rejects a negative integer path segment', () => {
        const negative = -1 - Math.floor(Math.random() * 100);
        const err = captureError(() => validateQuery(sdJwtQuery({ claims: [{ path: ['nationalities', negative] }] })));
        expect(err.code).toBe('invalid_claim_path');
        expect(err.path).toBe('/credentials/0/claims/0/path/1');
    });

    it('rejects a non-integer numeric path segment', () => {
        const fractional = Math.floor(Math.random() * 10) + 0.5;
        const err = captureError(() => validateQuery(sdJwtQuery({ claims: [{ path: ['nationalities', fractional] }] })));
        expect(err.code).toBe('invalid_claim_path');
        expect(err.path).toBe('/credentials/0/claims/0/path/1');
    });

    it('accepts a two-string mdoc path with intent_to_retain', () => {
        const input = mdocQuery({
            claims: [{ path: ['eu.europa.ec.eudi.pid.1', 'birth_date'], intent_to_retain: Math.random() < 0.5 }],
        });
        expect(() => validateQuery(input)).not.toThrow();
    });

    it('rejects a non-boolean intent_to_retain', () => {
        const err = captureError(() =>
            validateQuery(mdocQuery({ claims: [{ path: ['eu.europa.ec.eudi.pid.1', 'birth_date'], intent_to_retain: 'yes' }] }))
        );
        expect(err.code).toBe('invalid_type');
        expect(err.path).toBe('/credentials/0/claims/0/intent_to_retain');
    });

    it.each([
        ['one segment', ['birth_date']],
        ['three segments', ['eu.europa.ec.eudi.pid.1', 'nationalities', 'x']],
        ['a numeric segment', ['eu.europa.ec.eudi.pid.1', 0]],
        ['a null segment', ['eu.europa.ec.eudi.pid.1', null]],
    ])('rejects an mdoc path with %s', (_label, path) => {
        const err = captureError(() => validateQuery(mdocQuery({ claims: [{ path }] })));
        expect(err.code).toBe('invalid_claim_path');
        expect(err.path).toBe('/credentials/0/claims/0/path');
    });

    it('rejects claim_sets when claims is absent', () => {
        const err = captureError(() => validateQuery(sdJwtQuery({ claim_sets: [[randomId()]] })));
        expect(err.code).toBe('invalid_claim_set_reference');
        expect(err.path).toBe('/credentials/0/claim_sets');
    });

    it('rejects a claim without id when claim_sets is present', () => {
        const claimId = randomId();
        const input = sdJwtQuery({
            claims: [{ id: claimId, path: ['birthdate'] }, { path: ['family_name'] }],
            claim_sets: [[claimId]],
        });
        const err = captureError(() => validateQuery(input));
        expect(err.code).toBe('missing_field');
        expect(err.path).toBe('/credentials/0/claims/1/id');
    });

    it.each([
        ['an empty array', []],
        ['not an array', { a: ['x'] }],
    ])('rejects claim_sets that is %s', (_label, claimSets) => {
        const err = captureError(() =>
            validateQuery(sdJwtQuery({ claims: [{ id: 'x', path: ['birthdate'] }], claim_sets: claimSets }))
        );
        expect(err.code).toBe('invalid_type');
        expect(err.path).toBe('/credentials/0/claim_sets');
    });
});

describe('validateQuery — trusted_authorities (§6.1.1)', () => {
    const withTa = (trustedAuthorities: unknown) => ({
        credentials: [{ id: 'c1', format: 'dc+sd-jwt', meta: SD_JWT_META, trusted_authorities: trustedAuthorities }],
    });

    it('accepts well-formed entries of several types', () => {
        const input = withTa([
            { type: 'aki', values: [randomId(22)] },
            { type: 'etsi_tl', values: [`https://tl.example.com/${randomId()}.xml`] },
        ]);
        expect(() => validateQuery(input)).not.toThrow();
    });

    it.each([
        ['not an array', { type: 'aki', values: ['x'] }, 'invalid_type', '/credentials/0/trusted_authorities'],
        ['an empty array', [], 'invalid_type', '/credentials/0/trusted_authorities'],
        ['an entry that is not an object', ['aki'], 'invalid_type', '/credentials/0/trusted_authorities/0'],
        ['an entry without type', [{ values: ['x'] }], 'missing_field', '/credentials/0/trusted_authorities/0/type'],
        ['a non-string type', [{ type: 1, values: ['x'] }], 'invalid_type', '/credentials/0/trusted_authorities/0/type'],
        ['an empty type', [{ type: '', values: ['x'] }], 'invalid_type', '/credentials/0/trusted_authorities/0/type'],
        ['an entry without values', [{ type: 'aki' }], 'missing_field', '/credentials/0/trusted_authorities/0/values'],
        ['empty values', [{ type: 'aki', values: [] }], 'invalid_type', '/credentials/0/trusted_authorities/0/values'],
        ['a non-string value', [{ type: 'aki', values: [42] }], 'invalid_type', '/credentials/0/trusted_authorities/0/values'],
    ])('rejects %s', (_label, trustedAuthorities, code, path) => {
        const err = captureError(() => validateQuery(withTa(trustedAuthorities)));
        expect(err.code).toBe(code);
        expect(err.path).toBe(path);
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
