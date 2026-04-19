import { DcqlValidationError } from '../errors.js';
import type { CredentialQuery } from '../types.js';

import { validateClaimsQueryArray } from './claims.js';

export function validateCredentialQuery(input: unknown, basePath: string): CredentialQuery {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new DcqlValidationError('CredentialQuery must be an object', 'invalid_type', basePath);
    }
    const obj = input as Record<string, unknown>;

    if (!('id' in obj)) {
        throw new DcqlValidationError('missing CredentialQuery.id', 'missing_field', `${basePath}/id`);
    }
    if (typeof obj['id'] !== 'string') {
        throw new DcqlValidationError('CredentialQuery.id must be a string', 'invalid_type', `${basePath}/id`);
    }
    if (!('format' in obj)) {
        throw new DcqlValidationError('missing CredentialQuery.format', 'missing_field', `${basePath}/format`);
    }
    if (typeof obj['format'] !== 'string') {
        throw new DcqlValidationError('CredentialQuery.format must be a string', 'invalid_type', `${basePath}/format`);
    }

    if ('meta' in obj && obj['meta'] !== undefined) {
        validateMeta(obj['meta'], `${basePath}/meta`);
    }
    if (
        'require_cryptographic_holder_binding' in obj &&
        obj['require_cryptographic_holder_binding'] !== undefined &&
        typeof obj['require_cryptographic_holder_binding'] !== 'boolean'
    ) {
        throw new DcqlValidationError(
            'require_cryptographic_holder_binding must be boolean',
            'invalid_type',
            `${basePath}/require_cryptographic_holder_binding`
        );
    }
    if ('multiple' in obj && obj['multiple'] !== undefined && typeof obj['multiple'] !== 'boolean') {
        throw new DcqlValidationError('multiple must be boolean', 'invalid_type', `${basePath}/multiple`);
    }

    if ('claims' in obj && obj['claims'] !== undefined) {
        validateClaimsQueryArray(obj['claims'], `${basePath}/claims`);
    }

    return obj as unknown as CredentialQuery;
}

function validateMeta(meta: unknown, path: string): void {
    if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) {
        throw new DcqlValidationError('meta must be an object', 'invalid_type', path);
    }
    const m = meta as Record<string, unknown>;
    if ('vct_values' in m && m['vct_values'] !== undefined) {
        if (!Array.isArray(m['vct_values']) || !m['vct_values'].every((v) => typeof v === 'string')) {
            throw new DcqlValidationError(
                'vct_values must be an array of strings',
                'invalid_type',
                `${path}/vct_values`
            );
        }
    }
    if ('doctype_value' in m && m['doctype_value'] !== undefined) {
        if (typeof m['doctype_value'] !== 'string') {
            throw new DcqlValidationError('doctype_value must be a string', 'invalid_type', `${path}/doctype_value`);
        }
    }
}
