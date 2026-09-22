import { describe, it, expect } from 'vitest';
import { validateQuery, matchQuery, buildSubmission } from '../src/index.js';

// Verbatim from README "Credential sets (disjunctions)".
describe('README credential_sets example', () => {
    const query = validateQuery({
        credentials: [
            { id: 'age-attestation', format: 'mso_mdoc',
              meta: { doctype_value: 'eu.europa.ec.av.1' },
              claims: [{ path: ['eu.europa.ec.av.1', 'age_over_18'] }] },
            { id: 'pid', format: 'dc+sd-jwt',
              meta: { vct_values: ['urn:eu.europa.ec.eudi:pid:1'] },
              claims: [{ path: ['birth_date'] }] },
        ],
        credential_sets: [{ options: [['age-attestation'], ['pid']] }],
    });

    it('matches the documented satisfied/matches/unmatched/submission output', () => {
        const result = matchQuery(query, [
            { id: 'c1', format: 'dc+sd-jwt', vct: 'urn:eu.europa.ec.eudi:pid:1',
              claims: { birth_date: '1990-01-01' } },
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
