import { describe, it, expect } from 'vitest';
import { validateQuery, matchQuery, buildSubmission } from '../src/index.js';

// Verbatim from README "Quick start".
describe('README quick start example', () => {
    it('matches a PID SD-JWT by vct urn:eudi:pid:1 and claim birthdate', () => {
        const query = validateQuery({
            credentials: [
                {
                    id: 'pid',
                    format: 'dc+sd-jwt',
                    meta: { vct_values: ['urn:eudi:pid:1'] },
                    claims: [{ path: ['birthdate'] }],
                },
            ],
        });

        const credentials = [
            {
                id: 'cred-0',
                format: 'dc+sd-jwt',
                vct: 'urn:eudi:pid:1',
                holder_bound: true,
                claims: { birthdate: '1990-01-01', family_name: 'Doe' },
            },
        ];

        const result = matchQuery(query, credentials);
        expect(result.satisfied).toBe(true);
        expect(buildSubmission(query, result)).toEqual({ pid: 'cred-0' });
    });
});

// Verbatim from README "Input abstraction".
describe('README input abstraction examples', () => {
    it('matches a PID mdoc keyed by namespace', () => {
        const query = validateQuery({
            credentials: [
                { id: 'pid-mdoc', format: 'mso_mdoc',
                  meta: { doctype_value: 'eu.europa.ec.eudi.pid.1' },
                  claims: [{ path: ['eu.europa.ec.eudi.pid.1', 'birth_date'], intent_to_retain: false }] },
            ],
        });

        expect(matchQuery(query, [
            { id: 'm1', format: 'mso_mdoc', doctype: 'eu.europa.ec.eudi.pid.1', holder_bound: true,
              claims: { 'eu.europa.ec.eudi.pid.1': { birth_date: '1990-01-01' } } },
        ]).satisfied).toBe(true);
    });

    it('matches a national PID through vct_aliases', () => {
        const query = validateQuery({
            credentials: [{ id: 'pid', format: 'dc+sd-jwt', meta: { vct_values: ['urn:eudi:pid:1'] } }],
        });

        expect(matchQuery(query, [
            { id: 'c1', format: 'dc+sd-jwt', vct: 'urn:eudi:pid:de:1',
              vct_aliases: ['urn:eudi:pid:1'], holder_bound: true,
              claims: { birthdate: '1990-01-01' } },
        ]).satisfied).toBe(true);
    });
});

// Verbatim from README "Credential sets (disjunctions)".
describe('README credential_sets example', () => {
    const query = validateQuery({
        credentials: [
            { id: 'age-attestation', format: 'mso_mdoc',
              meta: { doctype_value: 'eu.europa.ec.av.1' },
              claims: [{ path: ['eu.europa.ec.av.1', 'age_over_18'] }] },
            { id: 'pid', format: 'dc+sd-jwt',
              meta: { vct_values: ['urn:eudi:pid:1'] },
              claims: [{ path: ['birthdate'] }] },
        ],
        credential_sets: [{ options: [['age-attestation'], ['pid']] }],
    });

    it('matches the documented satisfied/matches/unmatched/submission output', () => {
        const result = matchQuery(query, [
            { id: 'c1', format: 'dc+sd-jwt', vct: 'urn:eudi:pid:1',
              claims: { birthdate: '1990-01-01' } },
        ]);

        expect(result.satisfied).toBe(true);
        expect(result.matches.map((m) => m.queryId)).toEqual(['pid']);
        expect(result.unmatched).toEqual([
            { queryId: 'age-attestation', reason: 'format_mismatch' },
        ]);
        expect(buildSubmission(query, result)).toEqual({ pid: 'c1' });
    });

    it('required: false makes a set satisfied even with nothing matching', () => {
        const optional = validateQuery({
            credentials: [query.credentials[0]],
            credential_sets: [{ options: [['age-attestation']], required: false }],
        });
        expect(matchQuery(optional, []).satisfied).toBe(true);
    });

    it('validateQuery rejects an option naming an undeclared credential id', () => {
        expect(() => validateQuery({
            credentials: [query.credentials[1]],
            credential_sets: [{ options: [['pid'], ['typo']] }],
        })).toThrow(/unknown credential id/);
    });
});
