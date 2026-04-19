import { describe, it, expect } from 'vitest';

import { DcqlMatchError } from '../src/errors.js';
import { buildSubmission } from '../src/submission/build.js';
import type { DcqlMatchResult, DcqlQuery } from '../src/types.js';

const q: DcqlQuery = {
    credentials: [
        { id: 'c1', format: 'dc+sd-jwt' },
        { id: 'c2', format: 'mso_mdoc', multiple: true },
    ],
};

describe('buildSubmission', () => {
    it('maps queryId to single credentialId for non-multiple queries', () => {
        const result: DcqlMatchResult = {
            satisfied: true,
            matches: [{ queryId: 'c1', credentialId: 'cred-A', extractedClaims: {} }],
            unmatched: [],
        };
        expect(buildSubmission(q, result)).toEqual({ c1: 'cred-A' });
    });

    it('maps queryId to array for multiple-true queries', () => {
        const result: DcqlMatchResult = {
            satisfied: true,
            matches: [
                { queryId: 'c2', credentialId: 'cred-X', extractedClaims: {} },
                { queryId: 'c2', credentialId: 'cred-Y', extractedClaims: {} },
            ],
            unmatched: [],
        };
        expect(buildSubmission(q, result)).toEqual({ c2: ['cred-X', 'cred-Y'] });
    });

    it('preserves ordering by credentialId appearance', () => {
        const result: DcqlMatchResult = {
            satisfied: true,
            matches: [
                { queryId: 'c2', credentialId: 'first', extractedClaims: {} },
                { queryId: 'c2', credentialId: 'second', extractedClaims: {} },
            ],
            unmatched: [],
        };
        const out = buildSubmission(q, result);
        expect(Array.isArray(out['c2']) && out['c2'][0]).toBe('first');
    });

    it('throws DcqlMatchError when result is not satisfied', () => {
        const result: DcqlMatchResult = {
            satisfied: false,
            matches: [],
            unmatched: [{ queryId: 'c1', reason: 'no_credential_found' }],
        };
        expect(() => buildSubmission(q, result)).toThrow(DcqlMatchError);
    });
});
