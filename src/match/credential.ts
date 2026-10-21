import type {
    ClaimsQuery,
    CredentialQuery,
    DecodedCredential,
    TrustedAuthoritiesQuery,
    UnmatchedReason,
} from '../types.js';

import { matchClaimValue } from './claim.js';

export type CredentialMatchResult =
    | { matched: true; extractedClaims: Record<string, unknown> }
    | { matched: false; reason: UnmatchedReason; detail?: string };

export function matchCredentialQuery(query: CredentialQuery, credential: DecodedCredential): CredentialMatchResult {
    if (query.format !== credential.format) {
        return { matched: false, reason: 'format_mismatch' };
    }
    const vctValues = query.meta?.vct_values;
    if (vctValues !== undefined) {
        const types = [credential.vct, ...(credential.vct_aliases ?? [])];
        if (!types.some((t) => t !== undefined && vctValues.includes(t))) {
            return { matched: false, reason: 'vct_mismatch' };
        }
    }
    if (query.meta?.doctype_value !== undefined) {
        if (credential.doctype !== query.meta.doctype_value) {
            return { matched: false, reason: 'doctype_mismatch' };
        }
    }
    // §6.1: require_cryptographic_holder_binding defaults to true. A credential
    // with unknown binding status (holder_bound undefined) is not rejected.
    if (query.require_cryptographic_holder_binding !== false && credential.holder_bound === false) {
        return { matched: false, reason: 'holder_binding_required' };
    }
    if (query.trusted_authorities && query.trusted_authorities.length > 0) {
        if (!matchesTrustedAuthorities(query.trusted_authorities, credential)) {
            return { matched: false, reason: 'trusted_authority_mismatch' };
        }
    }

    const claims = query.claims ?? [];
    if (claims.length === 0) return { matched: true, extractedClaims: {} };

    if (query.claim_sets && query.claim_sets.length > 0) {
        let lastFailureReason: UnmatchedReason = 'missing_claims';
        let lastFailureDetail: string | undefined;
        for (const set of query.claim_sets) {
            const extracted: Record<string, unknown> = {};
            let setOk = true;
            for (const claimId of set) {
                const claim = claims.find((c) => c.id === claimId);
                if (!claim) {
                    setOk = false;
                    lastFailureReason = 'missing_claims';
                    lastFailureDetail = `unknown claim id ${claimId}`;
                    break;
                }
                const r = matchClaimValue(credential.claims, claim);
                if (!r.matched) {
                    setOk = false;
                    lastFailureReason = r.reason;
                    lastFailureDetail = claimPathToPointer(claim.path);
                    break;
                }
                extracted[lastPathKey(claim.path)] = r.extractedValue;
            }
            if (setOk) return { matched: true, extractedClaims: extracted };
        }
        return lastFailureDetail !== undefined
            ? { matched: false, reason: lastFailureReason, detail: lastFailureDetail }
            : { matched: false, reason: lastFailureReason };
    }

    const extracted: Record<string, unknown> = {};
    for (const claim of claims) {
        const r = matchClaimValue(credential.claims, claim);
        if (!r.matched) {
            return { matched: false, reason: r.reason, detail: claimPathToPointer(claim.path) };
        }
        extracted[lastPathKey(claim.path)] = r.extractedValue;
    }
    return { matched: true, extractedClaims: extracted };
}

/**
 * §6.1.1: a credential matches when it matches one of the values in one of the
 * types. Typed `trusted_authorities` are compared per type; the deprecated
 * untyped `trusted_authority_ids` (used only when no typed data is given) are
 * compared against the values of every type.
 */
function matchesTrustedAuthorities(queries: TrustedAuthoritiesQuery[], credential: DecodedCredential): boolean {
    if (credential.trusted_authorities !== undefined) {
        const credentialAuthorities = credential.trusted_authorities;
        return queries.some((q) =>
            credentialAuthorities.some((ca) => ca.type === q.type && ca.values.some((v) => q.values.includes(v)))
        );
    }
    const legacyIds = credential.trusted_authority_ids ?? [];
    return queries.some((q) => q.values.some((v) => legacyIds.includes(v)));
}

function claimPathToPointer(path: ClaimsQuery['path']): string {
    return '/' + path.map((p) => (p === null ? '*' : String(p))).join('/');
}

function lastPathKey(path: ClaimsQuery['path']): string {
    for (let i = path.length - 1; i >= 0; i--) {
        const seg = path[i];
        if (typeof seg === 'string') return seg;
    }
    return path.map((p) => (p === null ? '*' : String(p))).join('.');
}
