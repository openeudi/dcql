import type { DcqlQuery, DcqlMatchResult, DecodedCredential, UnmatchedReason } from '../types.js';

import { isCredentialSetSatisfied } from './assignment.js';
import { matchCredentialQuery } from './credential.js';

/**
 * Match a DCQL query against a set of decoded credentials.
 *
 * Returns `{ satisfied, matches, unmatched }`. Each `unmatched` entry surfaces
 * the specific {@link UnmatchedReason} from the last credential attempted
 * against that query (`format_mismatch`, `vct_mismatch`, `doctype_mismatch`,
 * `missing_claims`, `value_mismatch`, or `trusted_authority_mismatch`), plus
 * a JSON-pointer `detail` when the failure targets a specific claim path.
 *
 * `'no_credential_found'` is reserved for the case where the credential list
 * is empty — no candidates were attempted, so no specific reason exists.
 *
 * When multiple candidates fail against the same query, the reason and detail
 * reflect the LAST credential attempted. DCQL does not specify credential
 * ordering, so callers treating `reason` as a primary failure classifier
 * should not rely on which candidate "won" the diagnostic.
 */
export function matchQuery(query: DcqlQuery, credentials: DecodedCredential[]): DcqlMatchResult {
    const matches: DcqlMatchResult['matches'] = [];
    const unmatched: DcqlMatchResult['unmatched'] = [];
    const satisfiedQueryIds = new Set<string>();

    for (const cq of query.credentials) {
        const candidates: Array<{
            credential: DecodedCredential;
            extractedClaims: Record<string, unknown>;
        }> = [];
        let lastFailure: { reason: UnmatchedReason; detail?: string } | undefined;

        for (const cred of credentials) {
            const r = matchCredentialQuery(cq, cred);
            if (r.matched) {
                candidates.push({ credential: cred, extractedClaims: r.extractedClaims });
                if (cq.multiple !== true) break;
            } else {
                lastFailure = r.detail !== undefined
                    ? { reason: r.reason, detail: r.detail }
                    : { reason: r.reason };
            }
        }

        if (candidates.length === 0) {
            const entry: DcqlMatchResult['unmatched'][number] = lastFailure
                ? lastFailure.detail !== undefined
                    ? { queryId: cq.id, reason: lastFailure.reason, detail: lastFailure.detail }
                    : { queryId: cq.id, reason: lastFailure.reason }
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
