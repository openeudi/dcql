import { DcqlValidationError } from '../errors.js';
import type { DcqlQuery } from '../types.js';

import { validateCredentialQuery } from './credential-query.js';
import { validateClaimSetsReferences, validateCredentialSets } from './cross-refs.js';

export function validateQuery(input: unknown): DcqlQuery {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new DcqlValidationError('DcqlQuery must be an object', 'invalid_type', '/');
    }
    const obj = input as Record<string, unknown>;

    if (!('credentials' in obj)) {
        throw new DcqlValidationError('missing DcqlQuery.credentials', 'missing_field', '/credentials');
    }
    if (!Array.isArray(obj['credentials'])) {
        throw new DcqlValidationError('DcqlQuery.credentials must be an array', 'invalid_type', '/credentials');
    }
    if (obj['credentials'].length === 0) {
        throw new DcqlValidationError('DcqlQuery.credentials must be non-empty', 'invalid_type', '/credentials');
    }

    const seenIds = new Set<string>();
    const credentials = obj['credentials'].map((c, i) => {
        const cred = validateCredentialQuery(c, `/credentials/${i}`);
        if (seenIds.has(cred.id)) {
            throw new DcqlValidationError(
                `duplicate credential id: ${cred.id}`,
                'duplicate_id',
                `/credentials/${i}/id`
            );
        }
        seenIds.add(cred.id);
        return cred;
    });

    validateClaimSetsReferences(credentials);

    const result: DcqlQuery = { credentials };
    if ('credential_sets' in obj && obj['credential_sets'] !== undefined) {
        result.credential_sets = validateCredentialSets(obj['credential_sets'], seenIds);
    }
    return result;
}
