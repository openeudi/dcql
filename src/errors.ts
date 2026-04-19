export type DcqlValidationErrorCode =
    | 'missing_field'
    | 'invalid_type'
    | 'duplicate_id'
    | 'unknown_format'
    | 'invalid_claim_path'
    | 'invalid_claim_set_reference'
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
