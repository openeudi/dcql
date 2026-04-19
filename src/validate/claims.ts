import { DcqlValidationError } from '../errors.js';
import type { ClaimsQuery } from '../types.js';

export function validateClaimsQueryArray(input: unknown, basePath: string): ClaimsQuery[] {
    if (!Array.isArray(input)) {
        throw new DcqlValidationError('claims must be an array', 'invalid_type', basePath);
    }
    return input.map((c, i) => validateClaimsQuery(c, `${basePath}/${i}`));
}

export function validateClaimsQuery(input: unknown, path: string): ClaimsQuery {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new DcqlValidationError('ClaimsQuery must be an object', 'invalid_type', path);
    }
    const obj = input as Record<string, unknown>;

    if ('id' in obj && obj['id'] !== undefined && typeof obj['id'] !== 'string') {
        throw new DcqlValidationError('ClaimsQuery.id must be a string', 'invalid_type', `${path}/id`);
    }

    if (!('path' in obj) || !Array.isArray(obj['path'])) {
        throw new DcqlValidationError('ClaimsQuery.path must be an array', 'invalid_claim_path', `${path}/path`);
    }
    if (obj['path'].length === 0) {
        throw new DcqlValidationError('ClaimsQuery.path must be non-empty', 'invalid_claim_path', `${path}/path`);
    }
    for (let i = 0; i < obj['path'].length; i++) {
        const seg = obj['path'][i];
        if (!(typeof seg === 'string' || typeof seg === 'number' || seg === null)) {
            throw new DcqlValidationError(
                'path segment must be string, number, or null',
                'invalid_claim_path',
                `${path}/path/${i}`
            );
        }
    }

    if ('values' in obj && obj['values'] !== undefined) {
        if (!Array.isArray(obj['values'])) {
            throw new DcqlValidationError('values must be an array', 'invalid_type', `${path}/values`);
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

    return obj as unknown as ClaimsQuery;
}
