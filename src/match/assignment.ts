import type { CredentialSetQuery } from '../types.js';

export function isCredentialSetSatisfied(set: CredentialSetQuery, satisfiedIds: Set<string>): boolean {
    if (set.required === false) return true;
    return set.options.some((opt) => opt.every((id) => satisfiedIds.has(id)));
}
