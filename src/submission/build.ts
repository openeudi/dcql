import { DcqlMatchError } from '../errors.js';
import type { DcqlMatchResult, DcqlQuery, DcqlSubmission } from '../types.js';

export function buildSubmission(query: DcqlQuery, result: DcqlMatchResult): DcqlSubmission {
    if (!result.satisfied) {
        throw new DcqlMatchError(
            `cannot build submission from unsatisfied result (${result.unmatched.length} unmatched)`
        );
    }
    const submission: DcqlSubmission = {};
    const multipleFlag = new Map<string, boolean>();
    for (const cq of query.credentials) multipleFlag.set(cq.id, cq.multiple === true);

    for (const m of result.matches) {
        const isMultiple = multipleFlag.get(m.queryId) === true;
        if (isMultiple) {
            const existing = submission[m.queryId];
            if (Array.isArray(existing)) existing.push(m.credentialId);
            else submission[m.queryId] = [m.credentialId];
        } else {
            submission[m.queryId] = m.credentialId;
        }
    }
    return submission;
}
