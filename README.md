# Backend — Obliq API (NestJS)

This document is the **source of truth** for the `server/` package: how it runs, how auth and permissions work, and what each HTTP surface exposes.

## Overview

The API is a **NestJS 11** application that provides:

- **JWT authentication** (access token in JSON responses; refresh token stored hashed on the user row; login also sets an `httpOnly` cookie).
- **Dynamic permission model**: permissions are strings (e.g. `users.view`). A user’s effective permissions are the union of their **role permissions** and **extra user permissions** (`user_permissions` join table).
- **Grant ceiling**: when granting via `POST /users/:id/permissions/:permissionId`, the grantor must already hold that permission (unless the grantor’s role name is `ADMIN`).
- **PostgreSQL** via **Sequelize** + **sequelize-typescript**, with `synchronize: true` so schema is applied from models (suitable for development; use migrations for production if you disable sync).
- **OpenAPI** UI at **`/api/docs`** (Swagger).
- **Global rate limiting** via `@nestjs/throttler` (see [Rate limiting](#rate-limiting)).

## Requirements

- Node.js 18+
- A PostgreSQL database reachable by a connection URI

## Quick start

```bash
cd server
yarn install
cp .env.example .env
# Set DB_CONNECTION_STRING, JWT_SECRET, REFRESH_TOKEN_SECRET, etc.

yarn db:seed    # roles, permissions, default admin (idempotent)
yarn start:dev  # http://localhost:5000 (or PORT from .env)
```

After seeding, a default admin exists (if not already present):

| Field    | Value               |
| -------- | ------------------- |
| Email    | `admin@example.com` |
| Password | `admin123456`       |

Interactive API docs: `http://localhost:<PORT>/api/docs`  
Health check (no auth): `GET /health`

## Environment variables

| Variable                   | Purpose                                                                          |
| -------------------------- | -------------------------------------------------------------------------------- |
| `PORT`                     | HTTP port (default `5000`)                                                       |
| `DB_CONNECTION_STRING`     | PostgreSQL URI (required)                                                        |
| `JWT_SECRET`               | Secret for access tokens                                                         |
| `JWT_EXPIRES_IN`           | Access token lifetime (e.g. `15m`)                                               |
| `REFRESH_TOKEN_SECRET`     | Secret for refresh tokens                                                        |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`)                                               |
| `FRONTEND_URL`             | Allowed CORS origin (plus a few built-in dev/production origins)                 |
| `NODE_ENV`                 | When `production`, Sequelize uses SSL for Postgres (`rejectUnauthorized: false`) |

See `.env.example` for a template.

## NPM scripts

| Script     | Command                                         | Purpose                                   |
| ---------- | ----------------------------------------------- | ----------------------------------------- |
| Dev server | `yarn start:dev`                                | `nest start --watch`                      |
| Production | `yarn start:prod`                               | `node dist/main` (run `yarn build` first) |
| Seed DB    | `yarn db:seed`                                  | `ts-node … src/seed.ts`                   |
| Tests      | `yarn test` / `yarn test:e2e` / `yarn test:cov` | Jest                                      |

## Architecture

### Entry and cross-cutting concerns

`src/main.ts`:

- **CORS** with allowlist (includes `FRONTEND_URL`, localhost, and `https://obliq-apps.netlify.app`).
- **Helmet** with `crossOriginResourcePolicy: cross-origin`.
- **Global `ValidationPipe`**: `whitelist`, `transform`, `forbidNonWhitelisted`.
- **Swagger** at `/api/docs` with bearer auth scheme.

`src/app.module.ts`:

- **`ConfigModule`** (global).
- **`ThrottlerModule`**: default **100 requests per 60 seconds** per TTL window (global `ThrottlerGuard`).
- **`SequelizeModule.forRoot`**: Postgres from `DB_CONNECTION_STRING`, `autoLoadModels: true`, `synchronize: true`.

### Module map

| Path                                             | Responsibility                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `src/modules/auth`                               | Login, register, refresh, logout, bootstrap status, `JwtStrategy`                   |
| `src/modules/users`                              | List/update/delete users, status, grant/revoke **extra** permissions, managed users |
| `src/modules/roles`                              | Role CRUD, assign/remove permissions on roles                                       |
| `src/modules/permissions`                        | Permission atom CRUD, admin grant/revoke on users (`permissions.manage`)            |
| `src/modules/leads`                              | Leads CRUD, status, assign                                                          |
| `src/modules/tasks`                              | Tasks CRUD                                                                          |
| `src/modules/reports`                            | Aggregated stats (`reports.view`)                                                   |
| `src/modules/dashboard`                          | Per-user dashboard counts (JWT only; no `@Permissions` on route)                    |
| `src/modules/audit-logs`                         | Read audit log entries; exports `AuditLogInterceptor`                               |
| `src/common/guards/permissions.guard.ts`         | Enforces `@Permissions('x.y')` against `req.user.permissions`                       |
| `src/common/decorators/permissions.decorator.ts` | `@Permissions(...)` metadata                                                        |

### Authorization model

1. **`JwtAuthGuard`** validates the bearer JWT and loads the user; `JwtStrategy.validate` attaches `userId`, `email`, `roleId`, `role`, and **`permissions`** to the request.
2. **`PermissionsGuard`** reads required permission strings from `@Permissions()` and allows the request if **any** required permission is present in `user.permissions` (`some`, not `every`).
3. **Effective permissions** are computed at **login/refresh** in `AuthService.extractPermissions`: role permission names ∪ extra permission names. They are **embedded in the JWT payload**. If an administrator changes a user’s role or extra permissions, existing access tokens still carry the old list until the user **logs in again** or **refreshes** (refresh re-runs `login` and issues a new access token with updated permissions).

### Grant ceiling (`users.edit`)

`UsersService.grantPermission` ensures the grantor holds the target permission (by name), except when the grantor’s role name is `ADMIN`.  
`POST /permissions/.../grant` (requires `permissions.manage`) does **not** apply the same ceiling in service code—it is intended for full permission administrators.

### Authentication details

- **Login** (`POST /auth/login`): validates user, requires `UserStatus.ACTIVE`, returns `{ access_token, user }`, sets `refresh_token` **httpOnly** cookie (7 days), stores **bcrypt hash** of refresh token on `users.refreshToken`.
- **Refresh** (`POST /auth/refresh`): body expects `refresh_token` and `userId`; compares plaintext refresh to stored hash, then reissues tokens via `login`.
- **Logout** (`POST /auth/logout`): JWT required; clears stored refresh hash and clears cookie.
- **Register** (`POST /auth/register`): first user in DB becomes `ADMIN` (role must exist—seed first); otherwise uses `roleId` from body or defaults to `CUSTOMER`. Returns the same shape as login (tokens + user) but **does not** set the refresh cookie in the controller (only login does).

### Database models (conceptual)

- **`users`**: profile, `password`, `status`, `roleId`, `managerId`, `refreshToken`, timestamps.
- **`roles`**, **`permissions`**, **`role_permissions`**, **`user_permissions`** (extra grants).
- **`leads`**: `LeadStatus` enum, `assignedTo`, `createdBy`.
- **`tasks`**: `TaskStatus`, `TaskPriority`, `assignedTo`, `createdBy`.
- **`audit_logs`**: `userId`, `action`, `resource`, `details` (JSONB), `ipAddress`, `createdAt` only (`updatedAt: false`).

Exact columns match `sequelize-typescript` models under `src/modules/**/models/`.

### Audit logging

- **`AuditLogsController`** exposes filtered reads for users with `audit_logs.view`.
- **`AuditLogInterceptor`** is **registered in `AuditLogsModule`** but is **not** wired as a global or per-controller interceptor in the current codebase. To record writes automatically, register it (e.g. `APP_INTERCEPTOR` or `@UseInterceptors` on selected controllers).

### Rate limiting

`ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])` with global `ThrottlerGuard`: by default **100 requests per minute** per throttler key (see `@nestjs/throttler` docs for IP/user defaults).

## HTTP API reference

Unless noted, routes expect **`Authorization: Bearer <access_token>`**.

### App

| Method | Path      | Auth | Description      |
| ------ | --------- | ---- | ---------------- |
| GET    | `/health` | No   | Liveness message |

### Auth (`/auth`)

| Method | Path             | Auth | Description                                     |
| ------ | ---------------- | ---- | ----------------------------------------------- |
| GET    | `/auth/status`   | No   | `{ isBootstrapped: boolean }` — any users exist |
| POST   | `/auth/register` | No   | Create user; first user → ADMIN                 |
| POST   | `/auth/login`    | No   | Tokens + user; sets refresh cookie              |
| POST   | `/auth/refresh`  | No   | Body: `refresh_token`, `userId`                 |
| POST   | `/auth/logout`   | JWT  | Invalidate refresh token + clear cookie         |
| POST   | `/auth/me`       | JWT  | Current user payload from JWT validation        |

### Users (`/users`) — `JwtAuthGuard` + `PermissionsGuard`

| Method | Path                                   | Permission                                |
| ------ | -------------------------------------- | ----------------------------------------- |
| GET    | `/users`                               | `users.view` — query `managerId` optional |
| GET    | `/users/managed/me`                    | `users.view`                              |
| GET    | `/users/:id`                           | `users.view`                              |
| GET    | `/users/:id/permissions`               | `users.view`                              |
| POST   | `/users/:id/permissions/:permissionId` | `users.edit` (grant ceiling)              |
| DELETE | `/users/:id/permissions/:permissionId` | `users.edit`                              |
| PATCH  | `/users/:id`                           | `users.edit`                              |
| PATCH  | `/users/:id/status`                    | `users.edit`                              |
| DELETE | `/users/:id`                           | `users.delete`                            |

There is **no** `POST /users` route; user creation for the app is **`POST /auth/register`**.

### Roles (`/roles`)

| Method | Path                                       | Permission     |
| ------ | ------------------------------------------ | -------------- |
| GET    | `/roles`                                   | `roles.view`   |
| GET    | `/roles/:id`                               | `roles.view`   |
| GET    | `/roles/:id/permissions`                   | `roles.view`   |
| POST   | `/roles`                                   | `roles.manage` |
| PATCH  | `/roles/:id`                               | `roles.manage` |
| POST   | `/roles/:roleId/permissions/:permissionId` | `roles.manage` |
| DELETE | `/roles/:roleId/permissions/:permissionId` | `roles.manage` |
| DELETE | `/roles/:id`                               | `roles.manage` |

### Permissions (`/permissions`)

| Method | Path                                              | Permission           |
| ------ | ------------------------------------------------- | -------------------- |
| GET    | `/permissions`                                    | `permissions.view`   |
| GET    | `/permissions/:id`                                | `permissions.view`   |
| POST   | `/permissions`                                    | `permissions.manage` |
| PATCH  | `/permissions/:id`                                | `permissions.manage` |
| DELETE | `/permissions/:id`                                | `permissions.manage` |
| POST   | `/permissions/users/:userId/grant/:permissionId`  | `permissions.manage` |
| DELETE | `/permissions/users/:userId/revoke/:permissionId` | `permissions.manage` |

### Leads (`/leads`)

| Method | Path                | Permission                                 |
| ------ | ------------------- | ------------------------------------------ |
| GET    | `/leads`            | `leads.view` — query `assignedTo` optional |
| GET    | `/leads/:id`        | `leads.view`                               |
| POST   | `/leads`            | `leads.manage` — sets `createdBy` from JWT |
| PATCH  | `/leads/:id`        | `leads.manage`                             |
| PATCH  | `/leads/:id/status` | `leads.manage`                             |
| PATCH  | `/leads/:id/assign` | `leads.manage`                             |
| DELETE | `/leads/:id`        | `leads.manage`                             |

### Tasks (`/tasks`)

| Method | Path         | Permission                                 |
| ------ | ------------ | ------------------------------------------ |
| GET    | `/tasks`     | `tasks.view` — query `assignedTo` optional |
| GET    | `/tasks/:id` | `tasks.view`                               |
| POST   | `/tasks`     | `tasks.manage` — sets `createdBy` from JWT |
| PATCH  | `/tasks/:id` | `tasks.manage`                             |
| DELETE | `/tasks/:id` | `tasks.manage`                             |

### Reports (`/reports`)

| Method | Path                | Permission     |
| ------ | ------------------- | -------------- |
| GET    | `/reports/overview` | `reports.view` |
| GET    | `/reports/users`    | `reports.view` |
| GET    | `/reports/leads`    | `reports.view` |
| GET    | `/reports/tasks`    | `reports.view` |

### Dashboard (`/dashboard`)

| Method | Path         | Auth     | Note                                     |
| ------ | ------------ | -------- | ---------------------------------------- |
| GET    | `/dashboard` | JWT only | No `@Permissions`; any valid active user |

### Audit logs (`/audit-logs`)

| Method | Path                         | Permission                                                           |
| ------ | ---------------------------- | -------------------------------------------------------------------- |
| GET    | `/audit-logs`                | `audit_logs.view` — filters: `userId`, `action`, `resource`, `limit` |
| GET    | `/audit-logs/user/:userId`   | `audit_logs.view`                                                    |
| GET    | `/audit-logs/action/:action` | `audit_logs.view`                                                    |

## Permission atoms (seed)

`src/seed.ts` defines the canonical names used by guards and the UI:

- `dashboard.view`
- `users.view`, `users.create`, `users.edit`, `users.delete`
- `roles.view`, `roles.manage`
- `permissions.view`, `permissions.manage`
- `leads.view`, `leads.manage`
- `tasks.view`, `tasks.manage`
- `reports.view`
- `audit_logs.view`

Role-to-permission defaults are also defined in `seed.ts` (`ADMIN`, `MANAGER`, `AGENT`, `CUSTOMER`).

## Extending the API

1. Add a Sequelize model under the relevant module and register it with `SequelizeModule.forFeature`.
2. Put business logic in `*.service.ts`, HTTP in `*.controller.ts`.
3. Protect routes with `@UseGuards(JwtAuthGuard, PermissionsGuard)` and `@Permissions('namespace.action')`.
4. Add new permission names to the seed (or create via API with `permissions.manage`) and assign to roles as needed.

## Production notes

- Prefer **`synchronize: false`** and explicit migrations for production databases.
- Rotate `JWT_SECRET` and `REFRESH_TOKEN_SECRET`; use strong values.
- Tighten CORS to only your deployed frontend origin(s).
- Consider wiring **`AuditLogInterceptor`** globally if you rely on audit trails for compliance.

## Related

- Repository root [README.md](../README.md) for full-stack context and frontend setup.
