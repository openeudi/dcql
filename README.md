# @openeudi/dcql

Zero-dependency TypeScript implementation of **DCQL** (Digital Credentials Query Language) for **OpenID4VP 1.0 final**.

- Query validation with structured errors (JSON-pointer paths + error codes)
- Format-agnostic credential matching (SD-JWT VC, mDOC, or any custom format)
- Spec-shaped submission object construction
- Interop-tested against the OpenWallet Foundation reference vectors
- Isomorphic: Node, Deno, Bun, browser, edge runtimes

## Install

```bash
npm install @openeudi/dcql
```

## Quick start

```ts
import { validateQuery, matchQuery, buildSubmission } from "@openeudi/dcql";

const query = validateQuery({
  credentials: [
    {
      id: "pid",
      format: "dc+sd-jwt",
      meta: { vct_values: ["urn:eudi:pid:1"] },
      claims: [{ path: ["birthdate"] }],
    },
  ],
});

const credentials = [
  {
    id: "cred-0",
    format: "dc+sd-jwt",
    vct: "urn:eudi:pid:1",
    holder_bound: true, // a valid KB-JWT was verified
    claims: { birthdate: "1990-01-01", family_name: "Doe" },
  },
];

const result = matchQuery(query, credentials);
if (result.satisfied) {
  const submission = buildSubmission(query, result);
  console.log(submission); // { pid: 'cred-0' }
}
```

The PID identifiers follow the PID Rulebook: SD-JWT VC `vct` `urn:eudi:pid:1`
(national subtypes `urn:eudi:pid:<cc>:1`) with the claim `birthdate`; mdoc
doctype `eu.europa.ec.eudi.pid.1` with the element `birth_date` in the
namespace of the same name. A PID carries no `age_over_18`; that element is in
the proof-of-age attestation (`eu.europa.ec.av.1`, mdoc).

## API reference

### `validateQuery(input: unknown): DcqlQuery`

Validates the shape of a DCQL query. Throws `DcqlValidationError` with a `code` and a JSON-pointer `path` into the invalid input.

Beyond types, it enforces the OpenID4VP 1.0 §6–§7 rules that a verifier must get right:

- credential and claim `id`s are non-empty strings of `[A-Za-z0-9_-]` (`invalid_id`) and unique (`duplicate_id`);
- `meta` is present on every credential query, with a non-empty `vct_values` for `dc+sd-jwt` and a `doctype_value` for `mso_mdoc` (`missing_field` / `invalid_type`);
- `claims`, `values`, `trusted_authorities` and `claim_sets` are non-empty when present;
- every claim has an `id` when `claim_sets` is present, and `claim_sets` is not allowed without `claims`;
- numeric path segments are non-negative integers, and an `mso_mdoc` path is exactly `[namespace, element]` (`invalid_claim_path`);
- each `trusted_authorities` entry has a string `type` and a non-empty `values` array of strings.

> **Breaking after 0.2.0: `meta` is required.** Queries that omit it, or omit
> `vct_values` / `doctype_value` for SD-JWT VC / mdoc, now fail validation, as
> OpenID4VP 1.0 requires. See the CHANGELOG.

### `matchQuery(query: DcqlQuery, credentials: DecodedCredential[]): DcqlMatchResult`

Finds credentials that satisfy each query. Returns `{ satisfied, matches, unmatched }`. Never throws.

> **`satisfied` is not `unmatched.length === 0`.** When the query has
> `credential_sets`, `satisfied` is computed from the sets, so a satisfied result
> can still carry unmatched entries. See
> [Credential sets (disjunctions)](#credential-sets-disjunctions).

Each entry in `unmatched` carries an `UnmatchedReason`:

| Reason | Meaning |
| --- | --- |
| `format_mismatch` | candidate's `format` did not equal the query's `format` |
| `vct_mismatch` | neither the candidate's `vct` nor any of its `vct_aliases` is in the query's `meta.vct_values` (sd-jwt-vc only) |
| `doctype_mismatch` | candidate's `doctype` was not equal to the query's `meta.doctype_value` (mso_mdoc only) |
| `holder_binding_required` | the query requires cryptographic holder binding (the default) and the candidate has `holder_bound: false` |
| `missing_claims` | candidate is missing one or more claim paths required by the query |
| `value_mismatch` | a required claim is present but its value is not in the query's `values:` filter |
| `trusted_authority_mismatch` | none of the candidate's trusted authorities match the query's `trusted_authorities` filter |
| `no_credential_found` | the candidate credentials list was empty for this query (reserved for the empty-input case only since 0.2.0) |

When a query has multiple candidate credentials, `matchQuery` reports the LAST candidate's failure (DCQL does not specify candidate ordering — see the `matchQuery` JSDoc for details).

> **0.2.0 BREAKING:** prior to 0.2.0 every failure collapsed to `'no_credential_found'`. Callers reading `unmatched[].reason` need to switch on the new specific values.

### `buildSubmission(query: DcqlQuery, result: DcqlMatchResult): DcqlSubmission`

Builds a spec-shaped `{ [queryId]: credentialId | credentialId[] }` map. Throws `DcqlMatchError` if the result is not satisfied.

### Credential sets (disjunctions)

`credential_sets` offers the holder a **choice**: the query is satisfied when one
listed option is satisfied, not when every credential matches. The canonical case
is asking for either of two credentials that answer the same question in
different formats — a proof-of-age attestation or a PID, say:

```ts
const query = validateQuery({
  credentials: [
    { id: "age-attestation", format: "mso_mdoc",
      meta: { doctype_value: "eu.europa.ec.av.1" },
      claims: [{ path: ["eu.europa.ec.av.1", "age_over_18"] }] },
    { id: "pid", format: "dc+sd-jwt",
      meta: { vct_values: ["urn:eudi:pid:1"] },
      claims: [{ path: ["birthdate"] }] },
  ],
  credential_sets: [{ options: [["age-attestation"], ["pid"]] }],
});
```

`matchQuery` resolves each set as follows:

| Set | Satisfied when |
| --- | --- |
| `required` omitted or `true` | at least one option has **all** of its credential ids satisfied |
| `required: false` | always — an optional set never makes the result unsatisfied |

A query with `credential_sets` is satisfied only when **every** set is satisfied.

#### Unmatched entries are expected on success

A holder satisfying one option does not satisfy the others, so the untaken
options are reported in `unmatched` **while `satisfied` is `true`**:

```ts
// Holder has the PID but not the attestation.
const result = matchQuery(query, [
  { id: "c1", format: "dc+sd-jwt", vct: "urn:eudi:pid:1",
    claims: { birthdate: "1990-01-01" } },
]);

result.satisfied;  // true
result.matches;    // [{ queryId: "pid", credentialId: "c1", ... }]
result.unmatched;  // [{ queryId: "age-attestation", reason: "format_mismatch" }]

buildSubmission(query, result); // { pid: "c1" }
```

The `reason` on such an entry describes why that *option* did not match (here the
holder had no `mso_mdoc` credential at all) and is not an error. Branch on
`satisfied`, never on `unmatched.length`, and expect benign entries in
diagnostic logs for every disjunction the holder resolves.

`validateQuery` additionally rejects a set whose `options` reference a credential
id not declared in `credentials`, so a typo fails at validation rather than
silently producing an unsatisfiable set.

### Error classes

```ts
DcqlValidationError { code: DcqlValidationErrorCode; path: string }
DcqlMatchError { code: 'unsatisfied_query' }
```

### Input abstraction

`DecodedCredential` is format-agnostic. Your code decodes credentials (e.g., via `@openeudi/openid4vp`) and produces this shape:

```ts
type DecodedCredential = {
  id: string;
  format: string; // 'dc+sd-jwt' | 'mso_mdoc' | ...
  vct?: string; // for sd-jwt-vc
  vct_aliases?: string[]; // further types: aka_vcts, out-of-band `extends`
  doctype?: string; // for mso_mdoc
  claims: Record<string, unknown>; // mdoc: { [namespace]: { [element]: value } }
  holder_bound?: boolean; // proof of holder binding verified?
  trusted_authorities?: { type: string; values: string[] }[];
  /** @deprecated untyped; use trusted_authorities */
  trusted_authority_ids?: string[];
};
```

For mdoc, key `claims` by namespace so that a query path such as
`["eu.europa.ec.eudi.pid.1", "birth_date"]` resolves:

```ts
const query = validateQuery({
  credentials: [
    { id: "pid-mdoc", format: "mso_mdoc",
      meta: { doctype_value: "eu.europa.ec.eudi.pid.1" },
      claims: [{ path: ["eu.europa.ec.eudi.pid.1", "birth_date"], intent_to_retain: false }] },
  ],
});

matchQuery(query, [
  { id: "m1", format: "mso_mdoc", doctype: "eu.europa.ec.eudi.pid.1", holder_bound: true,
    claims: { "eu.europa.ec.eudi.pid.1": { birth_date: "1990-01-01" } } },
]).satisfied; // true
```

#### Type aliases (`vct_aliases`)

`meta.vct_values` lists the accepted SD-JWT VC types. A wallet may return a
credential of a type that inherits from one of them — every national PID type
`urn:eudi:pid:<cc>:1` extends `urn:eudi:pid:1`. This library does not fetch or
resolve SD-JWT VC Type Metadata, so the caller lists the additional types in
`vct_aliases`:

- from the issuer-signed `aka_vcts` claim, if present (OpenID4VP 1.1, SD-JWT VC);
- from type inheritance (`extends`) the verifier has established out of band.

```ts
{ id: "c1", format: "dc+sd-jwt", vct: "urn:eudi:pid:de:1",
  vct_aliases: ["urn:eudi:pid:1"], holder_bound: true,
  claims: { birthdate: "1990-01-01" } }
// matches meta: { vct_values: ["urn:eudi:pid:1"] }
```

Only add aliases backed by issuer-signed data or by type metadata whose
integrity you checked; an alias widens what the query accepts.

#### Holder binding (`holder_bound`)

`require_cryptographic_holder_binding` defaults to `true` (OpenID4VP 1.0 §6.1).
Set `holder_bound` to whether the presentation's holder-binding proof (a KB-JWT
for SD-JWT VC, device authentication for mdoc) was verified. With
`holder_bound: false`, a query that requires binding fails with
`holder_binding_required`. When `holder_bound` is omitted the check is skipped,
which keeps older callers working — verifiers should always set it.

#### Trusted authorities

Pass the credential's trust information tagged by type in
`trusted_authorities`; each query entry is matched only against credential
values of the same `type`. Values are compared as strings, so produce them in
the encoding the spec defines for the type (for `aki`, the base64url-encoded
KeyIdentifier; for `etsi_tl`, the trusted list URL).

The untyped `trusted_authority_ids` still works but is deprecated: its ids match
query values of any type, so an `aki` value could satisfy an `etsi_tl` query.
It is ignored when `trusted_authorities` is present.

## What this library does NOT do

- Credential decoding (SD-JWT, mDOC, COSE) — use `@openeudi/openid4vp` or similar.
- Cryptographic signature verification.
- HAIP constraint validation (planned for a separate helper).
- OpenID Foundation conformance suite integration (planned for a future release).

## License

Apache-2.0 — see [LICENSE](./LICENSE).

## Related

- [**@openeudi/core**](https://www.npmjs.com/package/@openeudi/core) — Framework-agnostic EUDI Wallet verification protocol engine.
- [**@openeudi/openid4vp**](https://www.npmjs.com/package/@openeudi/openid4vp) — OpenID4VP credential parsing (SD-JWT VC + mDOC).
- [**eIDAS Pro**](https://eidas-pro.com) — Managed verification service with admin dashboard and plugins.
