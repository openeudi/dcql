export const VERSION = '0.1.1';

export type {
    DcqlQuery,
    CredentialQuery,
    ClaimsQuery,
    CredentialSetQuery,
    TrustedAuthoritiesQuery,
    DecodedCredential,
    DcqlMatchResult,
    DcqlSubmission,
    UnmatchedReason,
} from './types.js';

export { DcqlValidationError, DcqlMatchError } from './errors.js';
export type { DcqlValidationErrorCode } from './errors.js';

export { validateQuery } from './validate/query.js';
export { matchQuery } from './match/query.js';
export { buildSubmission } from './submission/build.js';
