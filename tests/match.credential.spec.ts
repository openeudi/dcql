import { describe, it, expect } from 'vitest';

import { matchCredentialQuery } from '../src/match/credential.js';
import type { CredentialQuery, DecodedCredential } from '../src/types.js';

const sdJwt = (overrides: Partial<DecodedCredential> = {}): DecodedCredential => ({
    id: 'cred-0',
    format: 'dc+sd-jwt',
    vct: 'urn:eu.europa.ec.eudi:pid:1',
    claims: { age_over_18: true, family_name: 'Doe' },
    ...overrides,
});

describe('matchCredentialQuery — format/vct/doctype gates', () => {
    it('passes when format matches', () => {
        const q: CredentialQuery = { id: 'c1', format: 'dc+sd-jwt' };
        const r = matchCredentialQuery(q, sdJwt());
        expect(r.matched).toBe(true);
    });

    it('fails with format_mismatch when format differs', () => {
        const q: CredentialQuery = { id: 'c1', format: 'mso_mdoc' };
        const r = matchCredentialQuery(q, sdJwt());
        expect(r).toEqual({ matched: false, reason: 'format_mismatch' });
    });

    it('passes when vct_values contains credential vct', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'dc+sd-jwt',
            meta: { vct_values: ['urn:eu.europa.ec.eudi:pid:1', 'urn:other'] },
        };
        const r = matchCredentialQuery(q, sdJwt());
        expect(r.matched).toBe(true);
    });

    it('fails with vct_mismatch when vct not in list', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'dc+sd-jwt',
            meta: { vct_values: ['urn:other'] },
        };
        const r = matchCredentialQuery(q, sdJwt());
        expect(r).toEqual({ matched: false, reason: 'vct_mismatch' });
    });

    it('fails with doctype_mismatch when doctype differs', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'mso_mdoc',
            meta: { doctype_value: 'org.iso.18013.5.1.mDL' },
        };
        const mdoc: DecodedCredential = {
            id: 'cred-0',
            format: 'mso_mdoc',
            doctype: 'org.other',
            claims: {},
        };
        const r = matchCredentialQuery(q, mdoc);
        expect(r).toEqual({ matched: false, reason: 'doctype_mismatch' });
    });
});

describe('matchCredentialQuery — claims and claim_sets', () => {
    it('passes when all claims present (no claim_sets)', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'dc+sd-jwt',
            claims: [{ path: ['family_name'] }, { path: ['age_over_18'] }],
        };
        const r = matchCredentialQuery(q, sdJwt());
        expect(r.matched).toBe(true);
        if (r.matched) {
            expect(r.extractedClaims).toEqual({ family_name: 'Doe', age_over_18: true });
        }
    });

    it('fails with missing_claims when a claim is absent', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'dc+sd-jwt',
            claims: [{ path: ['missing_field'] }],
        };
        const r = matchCredentialQuery(q, sdJwt());
        expect(r).toEqual({ matched: false, reason: 'missing_claims', detail: '/missing_field' });
    });

    it('passes when at least one claim_set satisfied', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'dc+sd-jwt',
            claims: [
                { id: 'fn', path: ['family_name'] },
                { id: 'gn', path: ['given_name'] },
            ],
            claim_sets: [['fn'], ['gn']],
        };
        const r = matchCredentialQuery(q, sdJwt()); // has family_name, no given_name
        expect(r.matched).toBe(true);
        if (r.matched) expect(r.extractedClaims).toEqual({ family_name: 'Doe' });
    });

    it('fails when no claim_set can be satisfied', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'dc+sd-jwt',
            claims: [
                { id: 'gn', path: ['given_name'] },
                { id: 'dob', path: ['birthdate'] },
            ],
            claim_sets: [['gn'], ['dob']],
        };
        const r = matchCredentialQuery(q, sdJwt());
        expect(r.matched).toBe(false);
        if (!r.matched) expect(r.reason).toBe('missing_claims');
    });
});

describe('matchCredentialQuery — trusted_authorities', () => {
    it('passes when credential authority id is in allowed list', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'dc+sd-jwt',
            trusted_authorities: [{ type: 'aki', values: ['fp-A', 'fp-B'] }],
        };
        const r = matchCredentialQuery(q, sdJwt({ trusted_authority_ids: ['fp-A'] }));
        expect(r.matched).toBe(true);
    });

    it('fails with trusted_authority_mismatch otherwise', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'dc+sd-jwt',
            trusted_authorities: [{ type: 'aki', values: ['fp-A'] }],
        };
        const r = matchCredentialQuery(q, sdJwt({ trusted_authority_ids: ['fp-Z'] }));
        expect(r).toEqual({ matched: false, reason: 'trusted_authority_mismatch' });
    });

    it('fails with trusted_authority_mismatch when credential has no authority ids', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'dc+sd-jwt',
            trusted_authorities: [{ type: 'aki', values: ['fp-A'] }],
        };
        const r = matchCredentialQuery(q, sdJwt());
        expect(r).toEqual({ matched: false, reason: 'trusted_authority_mismatch' });
    });

    it('passes with empty trusted_authorities list', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'dc+sd-jwt',
            trusted_authorities: [],
        };
        const r = matchCredentialQuery(q, sdJwt());
        expect(r.matched).toBe(true);
    });
});

describe('matchCredentialQuery — claim_sets edge cases', () => {
    it('handles claim_set with unknown claim id in middle of set', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'dc+sd-jwt',
            claims: [
                { id: 'fn', path: ['family_name'] },
                { id: 'gn', path: ['given_name'] },
            ],
            claim_sets: [['fn', 'unknown_id']],
        };
        const r = matchCredentialQuery(q, sdJwt());
        expect(r.matched).toBe(false);
        if (!r.matched) expect(r.reason).toBe('missing_claims');
    });

    it('extracts only satisfied claims from matching claim_set', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'dc+sd-jwt',
            claims: [
                { id: 'fn', path: ['family_name'] },
                { id: 'gn', path: ['given_name'] },
            ],
            claim_sets: [['fn', 'gn'], ['fn']],
        };
        const r = matchCredentialQuery(q, sdJwt());
        expect(r.matched).toBe(true);
        if (r.matched) expect(r.extractedClaims).toEqual({ family_name: 'Doe' });
    });

    it('returns lastFailureDetail when claim_set fails', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'dc+sd-jwt',
            claims: [{ id: 'gn', path: ['given_name'] }],
            claim_sets: [['gn']],
        };
        const r = matchCredentialQuery(q, sdJwt());
        expect(r.matched).toBe(false);
        if (!r.matched) {
            expect(r.detail).toBeDefined();
            expect(r.detail).toMatch(/given_name/);
        }
    });

    it('uses array index path as key when no string found', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'dc+sd-jwt',
            claims: [{ path: ['addresses', 0] }],
        };
        const r = matchCredentialQuery(q, sdJwt({ claims: { addresses: [{ city: 'Berlin' }] } }));
        expect(r.matched).toBe(true);
        if (r.matched) {
            // When path is [addresses, 0], extracted value is { city: 'Berlin' }
            // lastPathKey should return 'addresses' (the last string segment)
            expect(r.extractedClaims).toHaveProperty('addresses');
        }
    });
});
