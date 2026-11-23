# CVLandingPage Security Baseline

This document records the security controls and operational requirements for the public CV landing page. It follows the control principles in KitaNotes `docs/SECURITY.md`, adapted for a public, anonymous website rather than a multi-user workspace application.

## Implemented controls

- All API mutations require POST, `application/json`, and an exact same-origin `Origin` header. Missing Origin is rejected. No cross-origin API access is enabled.
- The browser receives only an opaque, cryptographically random anonymous session cookie. It is `HttpOnly`, `Secure`, `SameSite=Strict`, uses the `__Host-` prefix, and expires after 24 hours.
- Only SHA-256 hashes of anonymous session tokens are stored in D1. Raw session tokens are never stored or exposed to JavaScript.
- Session-bound chat calls are capped at five per session on the server. Frontend counters are UX only.
- D1-backed atomic rate limits are applied to session creation (10/IP/hour), chat (10/IP/10 minutes and 50/IP/day), chat logs (20/IP/10 minutes), and download logs (5/IP/hour). IP fingerprints are HMAC-SHA-256 values keyed by the Worker secret `RATE_LIMIT_SECRET`; raw IP addresses are not stored by this application.
- Rate-limit storage errors fail closed. The rate-limit secret is required before session creation and chat can proceed.
- JSON request bodies are streamed and byte-limited, including requests without Content-Length. Payload shapes, message counts, roles and string lengths are validated.
- Gemini is called only server-side. The API key is read from the Worker secret `GEMINI_API_KEY`, sent in a request header rather than a URL query string, and never embedded in frontend assets.
- Gemini requests have a global timeout, bounded output tokens, a fixed model fallback list and no verbose upstream error-body logging.
- API errors are generic. User prompts, generated content, cookies, IP addresses and API keys are not written to application logs.
- Chat log rows are associated with the hashed anonymous session token. Chat logs are retained for 30 days; download metadata is retained for 180 days.
- Daily scheduled cleanup removes expired sessions, expired rate-limit buckets and records past their retention period.
- Security headers are applied to API and static asset responses: CSP, HSTS on HTTPS, frame denial, no-sniff, strict referrer policy, permissions policy, COOP and CORP.
- Dynamic CV content is rendered with DOM APIs and `textContent`, not HTML string interpolation or `innerHTML`. External links accept HTTPS only and use `noopener noreferrer`.
- The browser chatbot still has a five-question UX limit, but the authoritative limit is enforced by D1 on the server.

## Required production configuration

- [ ] Set Worker secret `GEMINI_API_KEY`.
- [ ] Set Worker secret `RATE_LIMIT_SECRET` to a high-entropy random value (at least 32 random bytes). Do not reuse the Gemini key.
- [ ] Confirm the `DB` binding points to the production D1 database.
- [ ] Confirm remote migration `0002_security_hardening.sql` is applied.
- [ ] Confirm the production Worker has the scheduled cleanup trigger.
- [ ] Smoke-test session creation, chat, five-question enforcement, rate-limit responses and download logging over the production HTTPS origin.
- [ ] Verify CSP in browser DevTools and add any strictly necessary asset host only after review.
- [ ] Verify HSTS only after all subdomains covered by `includeSubDomains` are HTTPS-ready.

## Operational notes and limitations

- The public chatbot is anonymous. The opaque session cookie prevents arbitrary session-ID spoofing and binds logs/quotas to a server-issued session, but it is not user authentication and does not prove a real person's identity.
- IP-based rate limits can affect users sharing a NAT or mobile carrier address. Cloudflare WAF / rate-limiting rules can provide an additional edge layer if abuse occurs.
- The chatbot receives public CV information. Do not add private personal data, credentials, or confidential employer information to its prompt.
- Chat history is sent to Google Gemini to generate replies and is stored in D1 for the stated 30-day retention period. Review the applicable privacy notice before collecting additional personal data.
- The frontend's CV content is intentionally public. Obfuscating browser JavaScript or attempting to hide inspectable frontend code is not a meaningful security control.
- GitHub Actions dependency pinning and a production D1 integration test should be reviewed before treating the deployment as fully production-verified.

## Verification

Run:

```bash
npm test
npm run cf:build
```

The tests cover same-origin enforcement, missing/cross-origin headers, bounded JSON parsing, security headers and fail-closed rate-limit configuration. They do not replace production D1 integration tests or live abuse testing.
