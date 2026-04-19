import type { ClaimsQuery, UnmatchedReason } from '../types.js';

export type ResolveResult = { found: boolean; values: unknown[] };

export function resolveClaimPath(claims: Record<string, unknown>, path: Array<string | number | null>): ResolveResult {
    let current: unknown[] = [claims];
    for (const segment of path) {
        const next: unknown[] = [];
        for (const node of current) {
            if (segment === null) {
                if (Array.isArray(node)) {
                    next.push(...node);
                }
            } else if (typeof segment === 'string') {
                if (typeof node === 'object' && node !== null && !Array.isArray(node)) {
                    const rec = node as Record<string, unknown>;
                    if (segment in rec) next.push(rec[segment]);
                }
            } else {
                if (Array.isArray(node) && segment >= 0 && segment < node.length) {
                    next.push(node[segment]);
                }
            }
        }
        if (next.length === 0) return { found: false, values: [] };
        current = next;
    }
    return { found: true, values: current };
}

export type ClaimMatchResult =
    | { matched: true; extractedValue: unknown }
    | { matched: false; reason: Extract<UnmatchedReason, 'missing_claims' | 'value_mismatch'> };

export function matchClaimValue(
    claims: Record<string, unknown>,
    query: Pick<ClaimsQuery, 'path' | 'values'>
): ClaimMatchResult {
    const resolved = resolveClaimPath(claims, query.path);
    if (!resolved.found) return { matched: false, reason: 'missing_claims' };

    if (query.values === undefined) {
        return { matched: true, extractedValue: resolved.values[0] };
    }

    const allowed = query.values as ReadonlyArray<unknown>;
    for (const v of resolved.values) {
        if (allowed.some((a) => Object.is(a, v))) {
            return { matched: true, extractedValue: v };
        }
    }
    return { matched: false, reason: 'value_mismatch' };
}
