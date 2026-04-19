import { DcqlValidationError } from '../errors.js';
import type { CredentialQuery, CredentialSetQuery } from '../types.js';

export function validateClaimSetsReferences(credentials: CredentialQuery[], basePath: string = ''): void {
    credentials.forEach((cred, cIdx) => {
        if (!cred.claim_sets) return;
        const claimIds = new Set<string>(
            (cred.claims ?? []).filter((c) => typeof c.id === 'string').map((c) => c.id as string)
        );
        cred.claim_sets.forEach((set, sIdx) => {
            if (!Array.isArray(set)) {
                throw new DcqlValidationError(
                    'claim_set entry must be an array of ids',
                    'invalid_type',
                    `${basePath}/credentials/${cIdx}/claim_sets/${sIdx}`
                );
            }
            set.forEach((id, iIdx) => {
                if (typeof id !== 'string' || !claimIds.has(id)) {
                    throw new DcqlValidationError(
                        `claim_sets references unknown claim id: ${id}`,
                        'invalid_claim_set_reference',
                        `${basePath}/credentials/${cIdx}/claim_sets/${sIdx}/${iIdx}`
                    );
                }
            });
        });
    });
}

export function validateCredentialSets(input: unknown, credentialIds: Set<string>): CredentialSetQuery[] {
    if (!Array.isArray(input)) {
        throw new DcqlValidationError('credential_sets must be an array', 'invalid_type', '/credential_sets');
    }
    return input.map((entry, sIdx) => validateCredentialSet(entry, sIdx, credentialIds));
}

function validateCredentialSet(input: unknown, sIdx: number, credentialIds: Set<string>): CredentialSetQuery {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new DcqlValidationError(
            'credential_set entry must be an object',
            'invalid_type',
            `/credential_sets/${sIdx}`
        );
    }
    const obj = input as Record<string, unknown>;
    if (!('options' in obj) || !Array.isArray(obj['options']) || obj['options'].length === 0) {
        throw new DcqlValidationError(
            'credential_set.options must be a non-empty array',
            'invalid_type',
            `/credential_sets/${sIdx}/options`
        );
    }
    (obj['options'] as unknown[]).forEach((opt, oIdx) => {
        if (!Array.isArray(opt)) {
            throw new DcqlValidationError(
                'option must be an array of credential ids',
                'invalid_type',
                `/credential_sets/${sIdx}/options/${oIdx}`
            );
        }
        opt.forEach((id, iIdx) => {
            if (typeof id !== 'string' || !credentialIds.has(id)) {
                throw new DcqlValidationError(
                    `credential_sets references unknown credential id: ${id}`,
                    'invalid_credential_set_reference',
                    `/credential_sets/${sIdx}/options/${oIdx}/${iIdx}`
                );
            }
        });
    });
    if ('required' in obj && obj['required'] !== undefined && typeof obj['required'] !== 'boolean') {
        throw new DcqlValidationError(
            'credential_set.required must be boolean',
            'invalid_type',
            `/credential_sets/${sIdx}/required`
        );
    }
    return obj as unknown as CredentialSetQuery;
}
