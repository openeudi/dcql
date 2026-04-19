import type { DcqlQuery, DcqlMatchResult, DecodedCredential } from '../types.js';

import { isCredentialSetSatisfied } from './assignment.js';
import { matchCredentialQuery } from './credential.js';

export function matchQuery(query: DcqlQuery, credentials: DecodedCredential[]): DcqlMatchResult {
    const matches: DcqlMatchResult['matches'] = [];
    const unmatched: DcqlMatchResult['unmatched'] = [];
    const satisfiedQueryIds = new Set<string>();

    for (const cq of query.credentials) {
        const candidates: Array<{
            credential: DecodedCredential;
            extractedClaims: Record<string, unknown>;
        }> = [];
        let lastDetail: string | undefined;

        for (const cred of credentials) {
            const r = matchCredentialQuery(cq, cred);
            if (r.matched) {
                candidates.push({ credential: cred, extractedClaims: r.extractedClaims });
                if (cq.multiple !== true) break;
            } else {
                lastDetail = r.detail;
            }
        }

        if (candidates.length === 0) {
            // Always surface 'no_credential_found' at the query level — callers
            // should not need to distinguish *why* a specific credential failed.
            const entry: DcqlMatchResult['unmatched'][number] =
                lastDetail !== undefined
                    ? { queryId: cq.id, reason: 'no_credential_found', detail: lastDetail }
                    : { queryId: cq.id, reason: 'no_credential_found' };
            unmatched.push(entry);
            continue;
        }

        for (const c of candidates) {
            matches.push({
                queryId: cq.id,
                credentialId: c.credential.id,
                extractedClaims: c.extractedClaims,
            });
        }
        satisfiedQueryIds.add(cq.id);
    }

    let satisfied: boolean;
    if (query.credential_sets && query.credential_sets.length > 0) {
        satisfied = query.credential_sets.every((s) => isCredentialSetSatisfied(s, satisfiedQueryIds));
    } else {
        satisfied = unmatched.length === 0;
    }

    return { satisfied, matches, unmatched };
}
