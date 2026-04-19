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

export type UnmatchedReason =
    | 'no_credential_found'
    | 'format_mismatch'
    | 'vct_mismatch'
    | 'doctype_mismatch'
    | 'missing_claims'
    | 'value_mismatch'
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
