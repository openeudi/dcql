/** Package version. Kept equal to `package.json` by `tests/version-consistency.spec.ts`. */
export const VERSION = '0.3.0';

export type {
    DcqlQuery,
    CredentialQuery,
    ClaimsQuery,
    CredentialSetQuery,
    TrustedAuthoritiesQuery,
    CredentialTrustedAuthority,
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
