export type DcqlValidationErrorCode =
    /** A REQUIRED property is absent. */
    | 'missing_field'
    /** A property has the wrong type or shape (including empty arrays the spec requires to be non-empty). */
    | 'invalid_type'
    /** A credential or claim `id` is not a non-empty string of `[A-Za-z0-9_-]` characters. */
    | 'invalid_id'
    /** A credential `id` or a claim `id` is used more than once in its array. */
    | 'duplicate_id'
    /** `format` is an empty string, so it identifies no Credential Format. */
    | 'unknown_format'
    /** A claims path pointer is malformed (§7), including mdoc paths that are not exactly two strings. */
    | 'invalid_claim_path'
    /** `claim_sets` references an unknown claim id, or is present without `claims`. */
    | 'invalid_claim_set_reference'
    /** `credential_sets` references an unknown credential id. */
    | 'invalid_credential_set_reference';

export class DcqlValidationError extends Error {
    readonly code: DcqlValidationErrorCode;
    readonly path: string;

    constructor(message: string, code: DcqlValidationErrorCode, path: string) {
        super(message);
        this.name = 'DcqlValidationError';
        this.code = code;
        this.path = path;
    }
}

export class DcqlMatchError extends Error {
    readonly code = 'unsatisfied_query' as const;

    constructor(message: string) {
        super(message);
        this.name = 'DcqlMatchError';
    }
}
