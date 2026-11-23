# CVLandingPage Security Baseline

This is the security baseline for a public, anonymous CV landing page. It adapts KitaNotes' security hardening playbook to a single public profile and a server-proxied AI chatbot.

## Threat model and boundaries
- The CV page is intentionally public. Browser source, profile data, HTML, CSS and JavaScript cannot be hidden from visitors.
- The Worker and D1 are trusted boundaries. Gemini credentials, session validation, rate limits, quotas, prompt construction and chat history remain server-side.
- The chatbot is anonymous, not an authenticated identity service. A session cookie binds requests and quotas; it does not identify a real person.
- User messages are untrusted input and must never be treated as system instructions or trusted conversation history.

## Implemented controls
### Browser and content security
- Dynamic CV content is built with DOM APIs and textContent; profile content is not interpolated into HTML strings.
- index.html contains no inline JavaScript or inline event handlers.
- External links accept HTTPS URLs only, reject embedded credentials, and use noopener noreferrer.
- Worker responses set CSP, HSTS on HTTPS, frame denial, MIME sniffing protection, strict referrer policy, permissions policy, COOP and CORP.
- All static asset requests pass through the Worker so the security headers also apply to the homepage and frontend assets.
- Public frontend code and CV data are not treated as secrets.

### API, sessions and abuse protection
- Mutating API routes require POST, application/json, and an exact same-origin Origin header.
- Anonymous sessions use a cryptographically random token in an HttpOnly, Secure, SameSite=Strict, Path=/ __Host- cookie.
- Only SHA-256 token hashes are stored in D1. The browser cannot read or choose the session identifier.
- Session creation is rate-limited to 10 per IP per hour. Chat is rate-limited to 10 per IP per 10 minutes and 50 per IP per day. Downloads are rate-limited to 5 per IP per hour.
- IP fingerprints are HMAC-SHA-256 values keyed by Worker secret RATE_LIMIT_SECRET; raw client IPs are not stored by this application.
- Rate-limit database errors fail closed. Cloudflare CF-Connecting-IP is used, not client-supplied X-Forwarded-For.
- The five-question limit is enforced atomically by D1, not by the frontend.
- JSON bodies are streamed and byte-limited. Chat messages are capped at 2,000 characters.

### AI and data security
- Gemini is called only from the Worker. GEMINI_API_KEY is a Worker secret and is sent in a request header, never in a URL or frontend bundle.
- The browser sends only the current user message. It cannot submit assistant history or a system prompt.
- Conversation history is loaded from D1 using the validated session hash. Assistant messages are inserted by the Worker only after a provider response.
- The system instruction constrains answers to public CV facts and treats user content as untrusted.
- Gemini requests have a timeout, bounded output tokens and a fixed model fallback list.
- Chat history is retained for 30 days; download metadata is retained for 180 days. Daily cleanup removes expired sessions, rate-limit buckets and expired records.
- Do not add private personal data, credentials or confidential employer information to the public CV context.

## Required production configuration
- [ ] Set Worker secret GEMINI_API_KEY.
- [ ] Set Worker secret RATE_LIMIT_SECRET to a high-entropy random value (at least 32 random bytes). Do not reuse the Gemini key.
- [ ] Confirm the DB binding points to the production D1 database.
- [ ] Confirm remote migrations 0001 and 0002 are applied.
- [ ] Confirm the scheduled cleanup trigger is deployed.
- [ ] Manually verify chat history, five-question enforcement, rate-limit responses and download logging on the production HTTPS origin. Automated smoke checks deliberately do not call Gemini or create download log entries.
- [ ] Inspect CSP violations in browser DevTools and add only necessary asset hosts after review.
- [ ] Review the privacy notice for chat messages sent to Google Gemini and stored in D1 for 30 days.

## Verification
Run npm install, npm test, npm run cf:build and npm audit --audit-level=high.

The unit tests cover request method/origin/content-type enforcement, bounded JSON parsing, security headers, frontend unsafe-sink checks and fail-closed rate-limit configuration.

The production smoke test verifies the live homepage security headers, session creation and cookie attributes, authenticated API session validation using deliberately invalid payloads, unauthenticated API rejection and no-store responses. It does not consume Gemini quota or create download log entries.

These automated checks do not replace live D1 integration tests, quota/rate-limit abuse testing, Cloudflare WAF configuration or independent penetration testing.

## Operational follow-ups
- Consider Cloudflare WAF rate-limiting rules as a second edge layer if abuse is observed.
- Add a D1 integration test using a disposable database before treating chat persistence as fully verified.
- Review and update dependency audits regularly. CI pins GitHub Actions to immutable commit SHAs; Wrangler is pinned to an exact package version.
