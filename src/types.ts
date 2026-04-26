/**
 * DCQL (Digital Credentials Query Language) types — 1:1 with OpenID4VP 1.0 final.
 */

export type DcqlQuery = {
    credentials: CredentialQuery[];
    credential_sets?: CredentialSetQuery[];
};

export type CredentialQuery = {
    id: string;
    format: 'dc+sd-jwt' | 'mso_mdoc' | 'jwt_vc_json' | (string & {});
    meta?: {
        vct_values?: string[];
        doctype_value?: string;
    };
    claims?: ClaimsQuery[];
    claim_sets?: string[][];
    trusted_authorities?: TrustedAuthoritiesQuery[];
    require_cryptographic_holder_binding?: boolean;
    multiple?: boolean;
};

export type ClaimsQuery = {
    id?: string;
    path: Array<string | number | null>;
    values?: Array<string | number | boolean>;
};

export type CredentialSetQuery = {
    options: string[][];
    required?: boolean;
    purpose?: string | Record<string, string>;
};

export type TrustedAuthoritiesQuery = {
    type: 'aki' | 'etsi_tl' | 'openid_federation' | (string & {});
    values: string[];
};

export type DecodedCredential = {
    id: string;
    format: string;
    vct?: string;
    doctype?: string;
    claims: Record<string, unknown>;
    trusted_authority_ids?: string[];
};

/**
 * Reason a query did not match against the supplied credentials.
 *
 * Returned per-query in `DcqlMatchResult.unmatched[].reason`. When a query has
 * multiple candidate credentials, `matchQuery` reports the LAST candidate's
 * failure (DCQL does not specify candidate ordering — see `matchQuery` JSDoc).
 *
 * @see {@link matchQuery}
 */
export type UnmatchedReason =
    /** The candidate credentials list was empty for this query. */
    | 'no_credential_found'
    /** Candidate's `format` did not equal the query's `format`. */
    | 'format_mismatch'
    /** Candidate's `vct` was not in the query's `meta.vct_values` (sd-jwt-vc only). */
    | 'vct_mismatch'
    /** Candidate's `doctype` was not equal to the query's `meta.doctype_value` (mso_mdoc only). */
    | 'doctype_mismatch'
    /** Candidate is missing one or more claim paths required by the query. */
    | 'missing_claims'
    /** A required claim is present, but its value is not in the query's `values:` filter. */
    | 'value_mismatch'
    /** None of the candidate's `trusted_authority_ids` are in the query's `trusted_authorities` filter. */
    | 'trusted_authority_mismatch';

export type DcqlMatchResult = {
    satisfied: boolean;
    matches: Array<{
        queryId: string;
        credentialId: string;
        extractedClaims: Record<string, unknown>;
    }>;
    unmatched: Array<{
        queryId: string;
        reason: UnmatchedReason;
        detail?: string;
    }>;
};

export type DcqlSubmission = Record<string, string | string[]>;
