import { describe, it, expectTypeOf } from 'vitest';

import type {
    DcqlQuery,
    CredentialQuery,
    ClaimsQuery,
    CredentialSetQuery,
    TrustedAuthoritiesQuery,
    DecodedCredential,
    DcqlMatchResult,
    DcqlSubmission,
} from '../src/types.js';

describe('types', () => {
    it('DcqlQuery accepts minimum valid shape', () => {
        const q: DcqlQuery = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt' }],
        };
        expectTypeOf(q.credentials).toBeArray();
    });

    it('CredentialQuery has optional meta, claims, claim_sets', () => {
        const q: CredentialQuery = {
            id: 'c1',
            format: 'mso_mdoc',
            meta: { doctype_value: 'org.iso.18013.5.1.mDL' },
            claims: [{ path: ['family_name'] }],
            claim_sets: [['f', 'g']],
            require_cryptographic_holder_binding: true,
            multiple: false,
        };
        expectTypeOf(q.format).toBeString();
    });

    it('ClaimsQuery path accepts string, number, null wildcard', () => {
        const q: ClaimsQuery = { path: ['addresses', 0, null, 'city'], values: ['Berlin', 'Paris'] };
        expectTypeOf(q.path).toBeArray();
    });

    it('DcqlMatchResult has satisfied, matches, unmatched', () => {
        const r: DcqlMatchResult = {
            satisfied: true,
            matches: [{ queryId: 'c1', credentialId: 'cred-0', extractedClaims: { age_over_18: true } }],
            unmatched: [],
        };
        expectTypeOf(r.satisfied).toBeBoolean();
    });

    it('DcqlSubmission maps queryId to credentialId or array', () => {
        const s: DcqlSubmission = { c1: 'cred-0', c2: ['cred-1', 'cred-2'] };
        expectTypeOf(s).toMatchTypeOf<Record<string, string | string[]>>();
    });

    it('TrustedAuthoritiesQuery and CredentialSetQuery exist', () => {
        const ta: TrustedAuthoritiesQuery = { type: 'aki', values: ['fingerprint-1'] };
        const cs: CredentialSetQuery = { options: [['c1', 'c2']], required: true, purpose: 'login' };
        expectTypeOf(ta.type).toBeString();
        expectTypeOf(cs.options).toBeArray();
    });

    it('DecodedCredential has id, format, claims', () => {
        const dc: DecodedCredential = {
            id: 'cred-0',
            format: 'dc+sd-jwt',
            vct: 'urn:eudi:pid:1',
            claims: { birthdate: '1990-01-01' },
        };
        expectTypeOf(dc.id).toBeString();
    });

    it('DecodedCredential accepts vct_aliases, holder_bound and typed trusted_authorities', () => {
        const dc: DecodedCredential = {
            id: 'cred-0',
            format: 'dc+sd-jwt',
            vct: 'urn:eudi:pid:de:1',
            vct_aliases: ['urn:eudi:pid:1'],
            holder_bound: true,
            trusted_authorities: [{ type: 'etsi_tl', values: ['https://tl.example.com/tl.xml'] }],
            claims: {},
        };
        expectTypeOf(dc.vct_aliases).toEqualTypeOf<string[] | undefined>();
        expectTypeOf(dc.holder_bound).toEqualTypeOf<boolean | undefined>();
    });

    it('ClaimsQuery accepts intent_to_retain', () => {
        const q: ClaimsQuery = { path: ['eu.europa.ec.eudi.pid.1', 'birth_date'], intent_to_retain: true };
        expectTypeOf(q.intent_to_retain).toEqualTypeOf<boolean | undefined>();
    });
});
