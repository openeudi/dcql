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
    /**
     * REQUIRED by OpenID4VP 1.0 §6.1, and enforced by `validateQuery`
     * (`vct_values` for `dc+sd-jwt`, `doctype_value` for `mso_mdoc`).
     *
     * Kept optional in the type so that `matchQuery` keeps accepting queries
     * built in code without going through `validateQuery`.
     */
    meta?: {
        vct_values?: string[];
        doctype_value?: string;
    };
    claims?: ClaimsQuery[];
    claim_sets?: string[][];
    trusted_authorities?: TrustedAuthoritiesQuery[];
    /** Defaults to `true` (OpenID4VP 1.0 §6.1). */
    require_cryptographic_holder_binding?: boolean;
    multiple?: boolean;
};

export type ClaimsQuery = {
    id?: string;
    path: Array<string | number | null>;
    values?: Array<string | number | boolean>;
    /** mso_mdoc only: equivalent to `IntentToRetain` in ISO/IEC 18013-5 (OpenID4VP 1.0 B.2.4). */
    intent_to_retain?: boolean;
};

export type CredentialSetQuery = {
    options: string[][];
    required?: boolean;
    purpose?: string | Record<string, string>;
};

/**
 * Trusted Authorities Query (OpenID4VP 1.0 §6.1.1).
 *
 * For `aki`, each value is the KeyIdentifier of an AuthorityKeyIdentifier,
 * encoded as base64url (§6.1.1.1). For `etsi_tl`, each value is the URL of an
 * ETSI trusted list. Matching is a plain string comparison, so callers must
 * produce `DecodedCredential.trusted_authorities` values in the same encoding.
 */
export type TrustedAuthoritiesQuery = {
    type: 'aki' | 'etsi_tl' | 'openid_federation' | (string & {});
    values: string[];
};

/**
 * Trust framework information derived by the caller for a decoded credential,
 * tagged by Trusted Authorities Query type.
 */
export type CredentialTrustedAuthority = {
    type: TrustedAuthoritiesQuery['type'];
    values: string[];
};

export type DecodedCredential = {
    id: string;
    format: string;
    vct?: string;
    /**
     * Additional SD-JWT VC types this credential is also of. A credential
     * matches `meta.vct_values` when `vct` or any alias is listed.
     *
     * Fill it from the issuer-signed `aka_vcts` claim and/or from type
     * inheritance established out of band (Type Metadata `extends`), e.g. a
     * national PID `urn:eudi:pid:de:1` that extends `urn:eudi:pid:1`. This
     * library does not resolve type metadata itself.
     */
    vct_aliases?: string[];
    doctype?: string;
    claims: Record<string, unknown>;
    /**
     * Whether the presentation carried a verified proof of cryptographic
     * holder binding (e.g. a valid KB-JWT for SD-JWT VC, device authentication
     * for mdoc).
     *
     * When `false` and the query requires holder binding (the default), the
     * credential does not match (`holder_binding_required`). When omitted,
     * holder binding is not checked, for backward compatibility. Verifiers
     * should always set it.
     */
    holder_bound?: boolean;
    /**
     * Typed trust framework information, matched per type against the query's
     * `trusted_authorities`. When present, it takes precedence over
     * `trusted_authority_ids`.
     */
    trusted_authorities?: CredentialTrustedAuthority[];
    /**
     * @deprecated Untyped ids match a query value of any type, so an `aki`
     * value can satisfy an `etsi_tl` query. Use `trusted_authorities`. Ignored
     * when `trusted_authorities` is present.
     */
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
    /** Neither the candidate's `vct` nor any of its `vct_aliases` was in the query's `meta.vct_values` (sd-jwt-vc only). */
    | 'vct_mismatch'
    /** Candidate's `doctype` was not equal to the query's `meta.doctype_value` (mso_mdoc only). */
    | 'doctype_mismatch'
    /** The query requires cryptographic holder binding and the candidate has `holder_bound: false`. */
    | 'holder_binding_required'
    /** Candidate is missing one or more claim paths required by the query. */
    | 'missing_claims'
    /** A required claim is present, but its value is not in the query's `values:` filter. */
    | 'value_mismatch'
    /** None of the candidate's trusted authorities match the query's `trusted_authorities` filter. */
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
