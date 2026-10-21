# Spec Examples

JSON examples adapted from OpenID for Verifiable Presentations 1.0 §6 (DCQL).

**Source:** https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#section-6
**License:** OpenID Foundation IPR — text available for study and implementation

Each fixture contains: `query` (DCQL input), `credentials` (DecodedCredential[]),
and `expected` (the desired match outcome).

`meta` is REQUIRED (§6.1), and an mso_mdoc claims path is exactly `[namespace, element]`
(§7.2.1); the fixtures follow both rules, with mdoc `claims` keyed by namespace.
