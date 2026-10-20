import { DcqlValidationError } from '../errors.js';
import type { ClaimsQuery } from '../types.js';

import { assertValidId } from './id.js';

export function validateClaimsQueryArray(input: unknown, basePath: string, format?: string): ClaimsQuery[] {
    if (!Array.isArray(input)) {
        throw new DcqlValidationError('claims must be an array', 'invalid_type', basePath);
    }
    if (input.length === 0) {
        throw new DcqlValidationError('claims must be non-empty when present', 'invalid_type', basePath);
    }
    const seenIds = new Set<string>();
    return input.map((c, i) => {
        const claim = validateClaimsQuery(c, `${basePath}/${i}`, format);
        if (claim.id !== undefined) {
            if (seenIds.has(claim.id)) {
                throw new DcqlValidationError(`duplicate claim id: ${claim.id}`, 'duplicate_id', `${basePath}/${i}/id`);
            }
            seenIds.add(claim.id);
        }
        return claim;
    });
}

export function validateClaimsQuery(input: unknown, path: string, format?: string): ClaimsQuery {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new DcqlValidationError('ClaimsQuery must be an object', 'invalid_type', path);
    }
    const obj = input as Record<string, unknown>;

    if ('id' in obj && obj['id'] !== undefined) {
        if (typeof obj['id'] !== 'string') {
            throw new DcqlValidationError('ClaimsQuery.id must be a string', 'invalid_type', `${path}/id`);
        }
        assertValidId(obj['id'], 'ClaimsQuery.id', `${path}/id`);
    }

    validateClaimPath(obj['path'], `${path}/path`, format);

    if ('values' in obj && obj['values'] !== undefined) {
        if (!Array.isArray(obj['values'])) {
            throw new DcqlValidationError('values must be an array', 'invalid_type', `${path}/values`);
        }
        if (obj['values'].length === 0) {
            throw new DcqlValidationError('values must be non-empty when present', 'invalid_type', `${path}/values`);
        }
        for (let i = 0; i < obj['values'].length; i++) {
            const v = obj['values'][i];
            if (!(typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
                throw new DcqlValidationError(
                    'values entry must be string, number, or boolean',
                    'invalid_type',
                    `${path}/values/${i}`
                );
            }
        }
    }

    if (
        'intent_to_retain' in obj &&
        obj['intent_to_retain'] !== undefined &&
        typeof obj['intent_to_retain'] !== 'boolean'
    ) {
        throw new DcqlValidationError('intent_to_retain must be boolean', 'invalid_type', `${path}/intent_to_retain`);
    }

    return obj as unknown as ClaimsQuery;
}

function validateClaimPath(input: unknown, path: string, format?: string): void {
    if (!Array.isArray(input)) {
        throw new DcqlValidationError('ClaimsQuery.path must be an array', 'invalid_claim_path', path);
    }
    if (input.length === 0) {
        throw new DcqlValidationError('ClaimsQuery.path must be non-empty', 'invalid_claim_path', path);
    }
    for (let i = 0; i < input.length; i++) {
        const seg: unknown = input[i];
        if (!(typeof seg === 'string' || typeof seg === 'number' || seg === null)) {
            throw new DcqlValidationError(
                'path segment must be string, number, or null',
                'invalid_claim_path',
                `${path}/${i}`
            );
        }
        if (typeof seg === 'number' && !(Number.isInteger(seg) && seg >= 0)) {
            throw new DcqlValidationError(
                'numeric path segment must be a non-negative integer',
                'invalid_claim_path',
                `${path}/${i}`
            );
        }
    }
    // §7.2.1: an mdoc claims path pointer is exactly [namespace, data element].
    if (format === 'mso_mdoc' && (input.length !== 2 || !input.every((seg) => typeof seg === 'string'))) {
        throw new DcqlValidationError(
            'mso_mdoc claim path must be exactly two strings: [namespace, element identifier]',
            'invalid_claim_path',
            path
        );
    }
}
