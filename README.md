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
      meta: { vct_values: ["urn:eu.europa.ec.eudi:pid:1"] },
      claims: [{ path: ["age_over_18"], values: [true] }],
    },
  ],
});

const credentials = [
  {
    id: "cred-0",
    format: "dc+sd-jwt",
    vct: "urn:eu.europa.ec.eudi:pid:1",
    claims: { age_over_18: true, family_name: "Doe" },
  },
];

const result = matchQuery(query, credentials);
if (result.satisfied) {
  const submission = buildSubmission(query, result);
  console.log(submission); // { pid: 'cred-0' }
}
```

## API reference

### `validateQuery(input: unknown): DcqlQuery`

Validates the shape of a DCQL query. Throws `DcqlValidationError` with a `code` and a JSON-pointer `path` into the invalid input.

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
| `vct_mismatch` | candidate's `vct` was not in the query's `meta.vct_values` (sd-jwt-vc only) |
| `doctype_mismatch` | candidate's `doctype` was not equal to the query's `meta.doctype_value` (mso_mdoc only) |
| `missing_claims` | candidate is missing one or more claim paths required by the query |
| `value_mismatch` | a required claim is present but its value is not in the query's `values:` filter |
| `trusted_authority_mismatch` | none of the candidate's `trusted_authority_ids` are in the query's `trusted_authorities` filter |
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
      meta: { vct_values: ["urn:eu.europa.ec.eudi:pid:1"] },
      claims: [{ path: ["birth_date"] }] },
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
  { id: "c1", format: "dc+sd-jwt", vct: "urn:eu.europa.ec.eudi:pid:1",
    claims: { birth_date: "1990-01-01" } },
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
  doctype?: string; // for mso_mdoc
  claims: Record<string, unknown>;
  trusted_authority_ids?: string[];
};
```

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
- [**eIDAS Pro**](https://eidas-pro.eu) — Managed verification service with admin dashboard and plugins.
