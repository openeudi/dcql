import { describe, it, expect } from 'vitest';

import { matchQuery } from '../src/match/query.js';
import type { DcqlQuery, DecodedCredential } from '../src/types.js';

const pid: DecodedCredential = {
    id: 'cred-pid',
    format: 'dc+sd-jwt',
    vct: 'urn:eu.europa.ec.eudi:pid:1',
    claims: { family_name: 'Doe', age_over_18: true },
};
const _mdl: DecodedCredential = {
    id: 'cred-mdl',
    format: 'mso_mdoc',
    doctype: 'org.iso.18013.5.1.mDL',
    claims: { family_name: 'Doe', driving_privileges: [{ vehicle_category: 'B' }] },
};

describe('matchQuery — simple cases', () => {
    it('satisfies a single-credential query', () => {
        const q: DcqlQuery = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    meta: { vct_values: ['urn:eu.europa.ec.eudi:pid:1'] },
                    claims: [{ path: ['family_name'] }],
                },
            ],
        };
        const r = matchQuery(q, [pid]);
        expect(r.satisfied).toBe(true);
        expect(r.matches).toEqual([
            { queryId: 'c1', credentialId: 'cred-pid', extractedClaims: { family_name: 'Doe' } },
        ]);
        expect(r.unmatched).toHaveLength(0);
    });

    it('reports unmatched when no credential satisfies', () => {
        const q: DcqlQuery = {
            credentials: [{ id: 'c1', format: 'jwt_vc_json' }],
        };
        const r = matchQuery(q, [pid]);
        expect(r.satisfied).toBe(false);
        expect(r.unmatched[0]?.queryId).toBe('c1');
        expect(r.unmatched[0]?.reason).toBe('no_credential_found');
    });

    it('includes detail in unmatched entry when credential fails with details', () => {
        const q: DcqlQuery = {
            credentials: [
                {
                    id: 'c1',
                    format: 'dc+sd-jwt',
                    claims: [{ path: ['missing_field'] }],
                },
            ],
        };
        const r = matchQuery(q, [pid]);
        expect(r.satisfied).toBe(false);
        expect(r.unmatched[0]?.queryId).toBe('c1');
        expect(r.unmatched[0]?.detail).toBeDefined();
    });

    it('requires all CredentialQueries without credential_sets', () => {
        const q: DcqlQuery = {
            credentials: [
                { id: 'c1', format: 'dc+sd-jwt' },
                { id: 'c2', format: 'jwt_vc_json' },
            ],
        };
        const r = matchQuery(q, [pid]);
        expect(r.satisfied).toBe(false);
        expect(r.matches.map((m) => m.queryId)).toEqual(['c1']);
        expect(r.unmatched.map((u) => u.queryId)).toEqual(['c2']);
    });

    it('allows one credential to satisfy multiple queries', () => {
        const q: DcqlQuery = {
            credentials: [
                { id: 'c1', format: 'dc+sd-jwt', claims: [{ path: ['family_name'] }] },
                { id: 'c2', format: 'dc+sd-jwt', claims: [{ path: ['age_over_18'] }] },
            ],
        };
        const r = matchQuery(q, [pid]);
        expect(r.satisfied).toBe(true);
        expect(r.matches.map((m) => m.credentialId)).toEqual(['cred-pid', 'cred-pid']);
    });

    it('deterministically picks first candidate when many match', () => {
        const a: DecodedCredential = { id: 'A', format: 'dc+sd-jwt', claims: {} };
        const b: DecodedCredential = { id: 'B', format: 'dc+sd-jwt', claims: {} };
        const q: DcqlQuery = { credentials: [{ id: 'c1', format: 'dc+sd-jwt' }] };
        expect(matchQuery(q, [a, b]).matches[0]?.credentialId).toBe('A');
        expect(matchQuery(q, [b, a]).matches[0]?.credentialId).toBe('B');
    });
});

describe('matchQuery — credential_sets', () => {
    it('satisfies when one option fully covered', () => {
        const q: DcqlQuery = {
            credentials: [
                { id: 'pid', format: 'dc+sd-jwt' },
                { id: 'mdl', format: 'mso_mdoc' },
            ],
            credential_sets: [{ options: [['pid'], ['mdl']], required: true }],
        };
        const r = matchQuery(q, [pid]);
        expect(r.satisfied).toBe(true);
    });

    it('fails when a required set has no satisfied option', () => {
        const q: DcqlQuery = {
            credentials: [
                { id: 'pid', format: 'jwt_vc_json' },
                { id: 'mdl', format: 'mso_mdoc' },
            ],
            credential_sets: [{ options: [['pid'], ['mdl']], required: true }],
        };
        const r = matchQuery(q, [pid]);
        expect(r.satisfied).toBe(false);
    });

    it('passes without non-required sets', () => {
        const q: DcqlQuery = {
            credentials: [
                { id: 'pid', format: 'dc+sd-jwt' },
                { id: 'opt', format: 'jwt_vc_json' },
            ],
            credential_sets: [
                { options: [['pid']], required: true },
                { options: [['opt']], required: false },
            ],
        };
        const r = matchQuery(q, [pid]);
        expect(r.satisfied).toBe(true);
    });
});

describe('matchQuery — multiple: true', () => {
    it('collects multiple matches when enabled', () => {
        const a: DecodedCredential = { id: 'A', format: 'dc+sd-jwt', claims: {} };
        const b: DecodedCredential = { id: 'B', format: 'dc+sd-jwt', claims: {} };
        const q: DcqlQuery = {
            credentials: [{ id: 'c1', format: 'dc+sd-jwt', multiple: true }],
        };
        const r = matchQuery(q, [a, b]);
        expect(r.matches.map((m) => m.credentialId)).toEqual(['A', 'B']);
    });
});
