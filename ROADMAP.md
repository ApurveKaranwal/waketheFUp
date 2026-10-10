# WTFup Feature Roadmap & Future Backlog

This document outlines the architectural roadmap, feature backlog, and release planning for **WTFup (Wake The F*** Up)**.

---

## 🧭 Milestone Overview

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│  V1: Production Core   │ ──►  │    V2: Growth & APIs   │ ──►  │  V3: Multi-Region/Team │ ──►  │  V4: Scale & Enterprise│
│  (Completed & Live)    │      │    (Target: Weeks 2–4) │      │   (Target: Weeks 5–8)  │      │   (Target: Weeks 9+)   │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

---

## ✅ V1: Production Core (Completed & Verified)

The current repository contains a fully tested, production-ready core engine:

- [x] **Modern Runtime & Framework:** Bun runtime + Hono API with split API (`backend/api.ts`) and Worker (`backend/worker.ts`) entrypoints.
- [x] **Authentication & Tenant Isolation:** Clerk Bearer-token verification with `authorizedParties` validation and account-scoped access control.
- [x] **Strict Security & SSRF Defense:** 
  - Comprehensive public IP resolution (`backend/services/urlSafety.ts`).
  - Blocked private, loopback, link-local, and transition IPv4/IPv6 CIDR ranges.
  - Pinned DNS lookups to prevent DNS rebinding.
  - No redirect following and hard 10-second timeout boundaries.
- [x] **State Machine & Incident Detection:**
  - 3-consecutive-failure threshold before opening an incident.
  - Deduplicated incident alerts (no alert storms during prolonged outages).
  - Single recovery notification upon service restoration.
- [x] **Durable Job Queues & Scheduling:**
  - BullMQ ping schedulers in Redis (`backend/queues/pingQueue.ts`).
  - Automatic scheduler reconciliation to prune orphaned or stale jobs.
  - Transactional email outbox with exponential backoff retries.
- [x] **Data Pruning & GDPR Compliance:**
  - Automated 90-day retention pruning for ping history and alert logs.
  - Self-service account deletion with transactional local-data wipe and retryable Clerk user deletion outbox.
- [x] **Observability & Health Probes:**
  - Prometheus `/metrics` registry (`wtfup_checks_total`, `wtfup_check_duration_seconds`, `wtfup_monitors_total`, `wtfup_rate_limit_hits_total`, `wtfup_alerts_total`, `wtfup_api_requests_total`).
  - `/health/live` and deep dependency `/health/ready` probes (testing DB, Redis, BullMQ support, worker heartbeats, and SMTP).
- [x] **Next.js 16 Dashboard & UI:**
  - Dynamic route protection via `frontend/proxy.ts`.
  - Real-time stat cards (Total, Active, Healthy 2xx, Down).
  - Interactive **Heartbeat Ribbon** (`HeartbeatBar.tsx`) showing status of the last 20 pings.
  - 24-hour calculated uptime percentage and average latency metrics.
  - SSL certificate expiration extraction and status indicator.
  - Monochromatic **Toast Notification System** (`ToastProvider`, `useToast()`) replacing native alerts.
  - Built-in confirmation modal (`ConfirmModal`) for destructive actions.
  - One-click copy URL button with clipboard feedback.
- [x] **DevOps & Containerization:**
  - Unified Bun Dockerfile for API and Worker (`backend/Dockerfile`).
  - Production Next.js container (`frontend/Dockerfile`).
  - Docker Compose orchestration (`docker-compose.yml`).
  - Automated CI pipeline (`.github/workflows/ci.yml`).
  - k6 load testing suite (`loadtests/k6-loadtest.js`).

---

## 🚀 V2: Growth Phase & Multi-Channel Alerting (Weeks 2–4)

### 1. Webhook & Multi-Channel Alerting
- [ ] **Discord Webhooks:**
  - Field on monitors: `discordWebhookUrl`.
  - Rich embed payload with colored sidebar (red for DOWN, green for RECOVERED), status code, latency, and direct dashboard link.
- [ ] **Slack Incoming Webhooks:**
  - Field on monitors: `slackWebhookUrl`.
  - Block Kit formatted incident message with actionable buttons ("Acknowledge", "View Incident").
- [ ] **Telegram Bot Integration:**
  - User-configurable Telegram Chat ID and Bot Token for instant mobile push notifications.
- [ ] **Generic Webhooks with HMAC Signing:**
  - Standard JSON webhook POST sent to custom developer endpoints.
  - Include `X-WTFup-Signature: sha256=...` header using a monitor-specific secret key for signature verification.
- [ ] **PagerDuty & Opsgenie Connectors:**
  - Trigger and auto-resolve PagerDuty incidents based on monitor transitions.

### 2. Advanced HTTP Check Configurations
- [ ] **Custom Request Headers:**
  - Support headers like `Authorization: Bearer <token>`, `User-Agent: WTFup-Bot/1.0`, or custom API keys.
- [ ] **HTTP Methods & Payload Support:**
  - Support `POST`, `PUT`, `PATCH`, `HEAD` methods in addition to `GET`.
  - Custom JSON request body payload for health endpoints requiring POST bodies.
- [ ] **Expected Status Codes:**
  - Configurable accepted status codes (e.g., allow `200,201,204` or `301,302` for redirect monitors).
- [ ] **Response Body Keyword Assertion:**
  - Regex or substring match in the response body (e.g., assert response contains `"status":"healthy"`).
  - Fail check if keyword is missing, even if HTTP status is 200.
- [ ] **Custom Request Timeouts:**
  - Allow per-monitor timeout thresholds between 2s and 30s.

### 3. Public Status Pages
- [ ] **Public Status Page Engine:**
  - Public route `/status/[slug]` with no authentication required.
  - Real-time overall system status ("All Systems Operational", "Partial Outage", "Major Outage").
  - 90-day historical uptime bars for all public services.
- [ ] **Incident Postings & Maintenance Windows:**
  - Schedule upcoming maintenance periods (suppress alerts during maintenance).
  - Post live incident updates (Investigating, Identified, Monitoring, Resolved).
- [ ] **Custom Domain / CNAME Support:**
  - Allow users to map `status.theircompany.com` to their WTFup status page via CNAME and automatic SSL.
- [ ] **SVG Markdown Badges:**
  - Dynamic SVG badges for GitHub READMEs: `https://api.wtfup.io/badge/[monitor-id]/uptime.svg`.

### 4. Developer REST API & CLI
- [ ] **Personal Access Tokens (API Keys):**
  - Generate scoped API keys (`wtf_live_...`) in account settings.
  - Full CRUD access to monitors via programmatic REST endpoints.
- [ ] **OpenAPI / Swagger Documentation:**
  - Interactive `/docs` endpoint with Swagger UI and OpenAPI 3.1 specification.
- [ ] **WTFup Official CLI:**
  - Lightweight CLI tool (`npm i -g @wtfup/cli` or `brew install wtfup`) to add and inspect monitors from the terminal.

---

## 🌐 V3: Teams, Collaboration & Distributed Probes (Weeks 5–8)

### 1. Team Collaboration & RBAC
- [ ] **Organizations & Workspaces:**
  - Support personal accounts and shared team workspaces.
  - Organization switcher in the navigation bar.
- [ ] **Role-Based Access Control (RBAC):**
  - Roles: `Owner`, `Admin`, `Member`, `Viewer`.
  - Granular permissions for monitor creation, editing, deleting, and billing management.
- [ ] **Team Alert Escalation:**
  - Route alerts to specific team members or on-call rotations based on monitor tags (`#frontend`, `#database`, `#payments`).
- [ ] **Audit Logs:**
  - Comprehensive immutable log of all team actions (who created a monitor, paused monitoring, or changed intervals).

### 2. Multi-Region Distributed Checking
- [ ] **Distributed Probe Nodes:**
  - Check workers running in multiple cloud regions:
    - `us-east` (N. Virginia)
    - `us-west` (Oregon)
    - `eu-central` (Frankfurt)
    - `ap-southeast` (Singapore)
- [ ] **Quorum-Based Consensus Checking:**
  - Prevent localized network blips from triggering false alarms.
  - Require at least 2 distinct geographical probes to fail before declaring a monitor DOWN.
- [ ] **Regional Latency Analytics:**
  - Dashboard graphs displaying latency breakdowns by geographical region.

### 3. Domain & SSL Intelligence
- [ ] **Proactive SSL Expiration Warnings:**
  - Automated alerts sent at 30 days, 14 days, and 3 days before SSL certificate expiry.
- [ ] **DNS Record Monitoring:**
  - Track A, AAAA, MX, and CNAME records; alert immediately if DNS records unexpectedly change.
- [ ] **Domain Expiration Tracker:**
  - WHOIS lookup integration alerting users when their domain registration is approaching renewal.

---

## 📈 V4: Scale, Monetization & Enterprise (Weeks 9+)

### 1. Freemium Tier & Stripe Billing
- [ ] **Subscription Plans:**
  - **Free Tier:** 10 monitors, 60s/300s intervals, email alerts, 90-day retention.
  - **Pro Tier ($9/mo):** 50 monitors, 30s intervals, Slack/Discord webhooks, 1 public status page.
  - **Team Tier ($29/mo):** 250 monitors, 10s intervals, multi-region probes, unlimited status pages, 5 team seats.
  - **Enterprise ($99+/mo):** Custom quotas, SAML SSO, SLA guarantees, dedicated support.
- [ ] **Stripe Customer Portal:**
  - Stripe Checkout, billing management, invoice history, and automated webhook provisioning.

### 2. Enterprise Security & Compliance
- [ ] **SAML / Single Sign-On (SSO):**
  - Okta, Google Workspace, Azure AD, and PingFederate support via Clerk Enterprise.
- [ ] **Data Residency & Compliance:**
  - Regional data isolation (EU-only database options for GDPR strict compliance).
  - SOC 2 Type II compliance controls and audit trails.
- [ ] **Automated Disaster Recovery (DR):**
  - Daily managed PostgreSQL WAL backups with point-in-time recovery (PITR).
  - Automated weekly restore drill scripts.

### 3. Advanced Telemetry & APM Integrations
- [ ] **OpenTelemetry (OTel) Export:**
  - Push monitor latency histograms and check traces directly to Datadog, New Relic, or Grafana Tempo.
- [ ] **Grafana Dashboard Templates:**
  - Pre-built Grafana dashboard JSON models ready for import into self-hosted Grafana instances.

---

## 🛠️ Implementation Guidance

When picking up any feature from this roadmap:
1. **SSRF Guard:** Always wrap any new outbound URL (e.g. webhooks, status page links) with `assertPublicMonitorUrl()`.
2. **Tenant Scoping:** Always verify user/org ownership before executing read/write transactions (`userId` or `orgId` filtering).
3. **Database Migrations:** Add new fields with migrations in `backend/prisma/migrations/` and verify with `bun x prisma validate`.
4. **Testing:** Ensure unit tests cover new service logic (`bun test`) and update types in both `backend/` and `frontend/lib/api.ts`.
