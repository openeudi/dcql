import { DcqlValidationError } from '../errors.js';
import type { CredentialQuery } from '../types.js';

import { validateClaimsQueryArray } from './claims.js';
import { assertValidId } from './id.js';

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
    assertValidId(obj['id'], 'CredentialQuery.id', `${basePath}/id`);
    if (!('format' in obj)) {
        throw new DcqlValidationError('missing CredentialQuery.format', 'missing_field', `${basePath}/format`);
    }
    if (typeof obj['format'] !== 'string') {
        throw new DcqlValidationError('CredentialQuery.format must be a string', 'invalid_type', `${basePath}/format`);
    }
    if (obj['format'].length === 0) {
        throw new DcqlValidationError('CredentialQuery.format must be non-empty', 'unknown_format', `${basePath}/format`);
    }
    const format = obj['format'];

    if (!('meta' in obj) || obj['meta'] === undefined) {
        throw new DcqlValidationError('missing CredentialQuery.meta', 'missing_field', `${basePath}/meta`);
    }
    validateMeta(obj['meta'], format, `${basePath}/meta`);

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

    if ('trusted_authorities' in obj && obj['trusted_authorities'] !== undefined) {
        validateTrustedAuthorities(obj['trusted_authorities'], `${basePath}/trusted_authorities`);
    }

    const hasClaims = 'claims' in obj && obj['claims'] !== undefined;
    if (hasClaims) {
        validateClaimsQueryArray(obj['claims'], `${basePath}/claims`, format);
    }

    if ('claim_sets' in obj && obj['claim_sets'] !== undefined) {
        validateClaimSetsShape(obj['claim_sets'], hasClaims ? (obj['claims'] as unknown[]) : undefined, basePath);
    }

    return obj as unknown as CredentialQuery;
}

function validateMeta(meta: unknown, format: string, path: string): void {
    if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) {
        throw new DcqlValidationError('meta must be an object', 'invalid_type', path);
    }
    const m = meta as Record<string, unknown>;

    // B.3.5: vct_values is REQUIRED for dc+sd-jwt.
    if (format === 'dc+sd-jwt' && m['vct_values'] === undefined) {
        throw new DcqlValidationError('missing meta.vct_values for dc+sd-jwt', 'missing_field', `${path}/vct_values`);
    }
    if (m['vct_values'] !== undefined) {
        const vctValues = m['vct_values'];
        if (!Array.isArray(vctValues) || !vctValues.every((v) => typeof v === 'string')) {
            throw new DcqlValidationError('vct_values must be an array of strings', 'invalid_type', `${path}/vct_values`);
        }
        if (vctValues.length === 0) {
            throw new DcqlValidationError('vct_values must be non-empty', 'invalid_type', `${path}/vct_values`);
        }
    }

    // B.2.3: doctype_value is REQUIRED for mso_mdoc.
    if (format === 'mso_mdoc' && m['doctype_value'] === undefined) {
        throw new DcqlValidationError(
            'missing meta.doctype_value for mso_mdoc',
            'missing_field',
            `${path}/doctype_value`
        );
    }
    if (m['doctype_value'] !== undefined) {
        if (typeof m['doctype_value'] !== 'string' || m['doctype_value'].length === 0) {
            throw new DcqlValidationError(
                'doctype_value must be a non-empty string',
                'invalid_type',
                `${path}/doctype_value`
            );
        }
    }
}

function validateTrustedAuthorities(input: unknown, path: string): void {
    if (!Array.isArray(input)) {
        throw new DcqlValidationError('trusted_authorities must be an array', 'invalid_type', path);
    }
    if (input.length === 0) {
        throw new DcqlValidationError('trusted_authorities must be non-empty when present', 'invalid_type', path);
    }
    input.forEach((entry: unknown, i) => {
        const entryPath = `${path}/${i}`;
        if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
            throw new DcqlValidationError('trusted_authorities entry must be an object', 'invalid_type', entryPath);
        }
        const ta = entry as Record<string, unknown>;
        if (ta['type'] === undefined) {
            throw new DcqlValidationError('missing trusted_authorities type', 'missing_field', `${entryPath}/type`);
        }
        if (typeof ta['type'] !== 'string' || ta['type'].length === 0) {
            throw new DcqlValidationError(
                'trusted_authorities type must be a non-empty string',
                'invalid_type',
                `${entryPath}/type`
            );
        }
        if (ta['values'] === undefined) {
            throw new DcqlValidationError('missing trusted_authorities values', 'missing_field', `${entryPath}/values`);
        }
        const values = ta['values'];
        if (!Array.isArray(values) || values.length === 0 || !values.every((v) => typeof v === 'string')) {
            throw new DcqlValidationError(
                'trusted_authorities values must be a non-empty array of strings',
                'invalid_type',
                `${entryPath}/values`
            );
        }
    });
}

/**
 * §6.1 / §6.3 / §6.4.1 rules on `claim_sets` that need the sibling `claims`.
 * References from `claim_sets` entries to claim ids are checked afterwards by
 * `validateClaimSetsReferences`.
 */
function validateClaimSetsShape(claimSets: unknown, claims: unknown[] | undefined, basePath: string): void {
    if (claims === undefined) {
        throw new DcqlValidationError(
            'claim_sets must not be present when claims is absent',
            'invalid_claim_set_reference',
            `${basePath}/claim_sets`
        );
    }
    if (!Array.isArray(claimSets) || claimSets.length === 0) {
        throw new DcqlValidationError(
            'claim_sets must be a non-empty array',
            'invalid_type',
            `${basePath}/claim_sets`
        );
    }
    claims.forEach((claim, i) => {
        if ((claim as Record<string, unknown>)['id'] === undefined) {
            throw new DcqlValidationError(
                'ClaimsQuery.id is required when claim_sets is present',
                'missing_field',
                `${basePath}/claims/${i}/id`
            );
        }
    });
}
