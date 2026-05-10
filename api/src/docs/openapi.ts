import type { OpenAPIV3 } from 'openapi-types';

import { env } from '../config/env';
import { ApplicationStatus } from '../modules/applications/entities';

const applicationStatusEnum = Object.values(ApplicationStatus);

const regulatorySummaryApplicationsByStatusRequired = [...applicationStatusEnum].sort(
  (a, b) => String(a).localeCompare(String(b))
);

const regulatorySummaryApplicationsByStatusProperties = Object.fromEntries(
  applicationStatusEnum.map((status) => [
    status,
    {
      type: `integer`,
      minimum: 0,
      description: `Applications currently in **${status}**.`,
    },
  ])
) as Record<string, OpenAPIV3.SchemaObject>;

export const openApiDocument: OpenAPIV3.Document = {
  openapi: `3.0.3`,
  info: {
    title: `BNR Licensing API`,
    description: `Bank licensing and compliance portal API. Bearer JWTs from \`POST /api/auth/login\` include \`roles\` (sorted role names) and a flattened \`permissions\` token list from all assigned roles. **Application lifecycle**: \`POST /api/applications\` creates **DRAFT** apps for the authenticated user; **Applicants** list/read only their own rows (**reviewers**, **approvers**, **admins** see all). \`PATCH /api/applications/{id}/status\` advances state with optimistic locking (\`expectedVersion\`). Requests targeting **APPROVED** must also carry **application:approve**. Separation-of-duties blocks final approval/rejection when the actor is the assigned reviewer.`,
    version: `0.1.0`,
  },
  servers: [
    {
      url: `http://localhost:${env.port}`,
      description: `Local development`,
    },
  ],
  tags: [
    { name: `Health`, description: `Liveness and module stubs` },
    { name: `Auth`, description: `Signup, login, and session` },
    { name: `Auth — Admin`, description: `User management (requires manage_users)` },
    {
      name: `Applications`,
      description: `License applications — status transitions (RBAC + optimistic locking) and module health`,
    },
    {
      name: `Compliance — Audit`,
      description: `Protected compliance routes for regulatory oversight (staff roles only).`,
    },
    { name: `Audit`, description: `Audit API — admin global audit search and module health` },
    { name: `Documents`, description: `Application document upload and secure download` },
    {
      name: `Executive Oversight Analytics`,
      description: `Admin-only regulatory dashboard metrics — pipeline volumes, reviewer-cycle timing, and oldest in-flight applications.`,
    },
    {
      name: `Regulatory Oversight Dashboard`,
      description: `Supervisor dashboard statistics for **ADMIN** and **APPROVER** principals with **analytics:view_dashboard** — status mix, reviewer workload, throughput timing, and security block events.`,
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: `http`,
        scheme: `bearer`,
        bearerFormat: `JWT`,
        description: `JWT from \`/api/auth/login\`, with \`roles: string[]\` and \`permissions: string[]\` (\`Authorization: Bearer <token>\`)`,
      },
    },
    schemas: {
      ErrorBody: {
        type: `object`,
        required: [`success`, `error`],
        properties: {
          success: { type: `boolean`, example: false },
          error: {
            type: `object`,
            required: [`code`, `message`],
            properties: {
              code: {
                type: `string`,
                enum: [`UNAUTHORIZED`, `CONFLICT`, `BAD_REQUEST`, `NOT_FOUND`, `SETUP_REQUIRED`, `INTERNAL_ERROR`, `FILE_TOO_LARGE`],
              },
              message: { type: `string` },
            },
          },
        },
      },
      PublicUser: {
        type: `object`,
        properties: {
          id: { type: `string`, format: `uuid` },
          email: { type: `string`, format: `email` },
          name: { type: `string` },
          roles: {
            type: `array`,
            items: {
              type: `string`,
              enum: [`APPLICANT`, `REVIEWER`, `APPROVER`, `ADMIN`],
            },
            description: `Distinct role names sorted alphabetically.`,
          },
        },
      },
      MeUser: {
        type: `object`,
        properties: {
          id: { type: `string`, format: `uuid` },
          email: { type: `string` },
          roles: {
            type: `array`,
            items: {
              type: `string`,
              enum: [`APPLICANT`, `REVIEWER`, `APPROVER`, `ADMIN`],
            },
            description: `Distinct role names sorted alphabetically.`,
          },
          permissions: {
            type: `array`,
            items: { type: `string` },
            description: `Permission tokens merged from all roles (e.g. manage_users, users:manage_users, approve, application:approve)`,
          },
        },
      },
      PromoteUserRequest: {
        type: `object`,
        required: [`role`],
        properties: {
          role: {
            type: `string`,
            enum: [`REVIEWER`, `APPROVER`],
            description: `Adds this role to the user if not already present (does not replace other roles).`,
          },
        },
      },
      AdminUsersListResponse: {
        type: `object`,
        required: [`success`, `users`, `page`, `limit`, `total`],
        properties: {
          success: { type: `boolean`, example: true },
          users: {
            type: `array`,
            items: { $ref: `#/components/schemas/PublicUser` },
          },
          page: { type: `integer`, minimum: 1 },
          limit: { type: `integer`, minimum: 1 },
          total: { type: `integer`, minimum: 0 },
        },
      },
      SignupRequest: {
        type: `object`,
        required: [`email`, `password`, `name`],
        properties: {
          email: { type: `string`, format: `email` },
          password: { type: `string`, minLength: 8 },
          name: { type: `string`, minLength: 2 },
        },
      },
      LoginRequest: {
        type: `object`,
        required: [`email`, `password`],
        properties: {
          email: { type: `string`, format: `email` },
          password: { type: `string` },
        },
      },
      CreateReviewerRequest: {
        type: `object`,
        required: [`email`, `password`, `name`],
        properties: {
          email: { type: `string`, format: `email` },
          password: { type: `string`, minLength: 8 },
          name: { type: `string`, minLength: 2 },
        },
      },
      ApplicationStatus: {
        type: `string`,
        enum: applicationStatusEnum,
        description: `Workflow state for a license application.`,
      },
      ApplicationRecord: {
        type: `object`,
        required: [
          `id`,
          `applicant_id`,
          `status`,
          `reviewer_id`,
          `approver_id`,
          `version`,
        ],
        properties: {
          id: { type: `string`, format: `uuid` },
          applicant_id: {
            type: `string`,
            format: `uuid`,
            description: `Owning applicant user id (set from JWT on create).`,
          },
          status: { $ref: `#/components/schemas/ApplicationStatus` },
          reviewer_id: {
            type: `string`,
            format: `uuid`,
            nullable: true,
            description: `Set when a reviewer moves the application from SUBMITTED to UNDER_REVIEW.`,
          },
          approver_id: {
            type: `string`,
            format: `uuid`,
            nullable: true,
            description: `Set on APPROVED or REJECTED by the deciding actor.`,
          },
          version: {
            type: `integer`,
            minimum: 0,
            description: `Incremented on each successful transition; client must send the prior value as expectedVersion.`,
          },
        },
      },
      AuditLogRecord: {
        type: `object`,
        required: [`id`, `application_id`, `actor_id`, `timestamp`],
        properties: {
          id: { type: `string`, format: `uuid` },
          application_id: { type: `string`, format: `uuid` },
          actor_id: { type: `string`, format: `uuid` },
          from_state: {
            allOf: [{ $ref: `#/components/schemas/ApplicationStatus` }],
            nullable: true,
            description: `Present for status transitions; null for non-transition events (e.g. document uploads).`,
          },
          to_state: {
            allOf: [{ $ref: `#/components/schemas/ApplicationStatus` }],
            nullable: true,
            description: `Present for status transitions; null for non-transition events.`,
          },
          event_action: {
            type: `string`,
            nullable: true,
            example: `DOCUMENT_UPLOADED`,
            description: `Set for domain events stored in the same audit stream as transitions.`,
          },
          document_id: {
            type: `string`,
            format: `uuid`,
            nullable: true,
          },
          metadata: {
            type: `object`,
            nullable: true,
            additionalProperties: true,
            description: `JSON payload for domain audit events (e.g. document version metadata).`,
          },
          timestamp: { type: `string`, format: `date-time` },
        },
      },
      ApplicationDetailRecord: {
        allOf: [
          { $ref: `#/components/schemas/ApplicationRecord` },
          {
            type: `object`,
            required: [`auditLogs`],
            properties: {
              auditLogs: {
                type: `array`,
                items: { $ref: `#/components/schemas/AuditLogRecord` },
              },
            },
          },
        ],
      },
      ApplicationsListResponse: {
        type: `object`,
        required: [`success`, `data`],
        properties: {
          success: { type: `boolean`, example: true },
          data: {
            type: `array`,
            items: { $ref: `#/components/schemas/ApplicationRecord` },
          },
        },
      },
      ApplicationDetailResponse: {
        type: `object`,
        required: [`success`, `data`],
        properties: {
          success: { type: `boolean`, example: true },
          data: { $ref: `#/components/schemas/ApplicationDetailRecord` },
        },
      },
      ApplicationComplianceAuditActor: {
        type: `object`,
        required: [`name`, `role`],
        properties: {
          name: { type: `string`, description: `Display name of the account that performed the action.` },
          role: {
            type: `string`,
            enum: [`APPLICANT`, `REVIEWER`, `APPROVER`, `ADMIN`],
            description: `Highest-privilege role assigned to the actor (seniority for oversight).`,
          },
        },
      },
      ApplicationComplianceAuditLogEntry: {
        type: `object`,
        required: [
          `id`,
          `application_id`,
          `actor_id`,
          `actor`,
          `action_label`,
          `event_action`,
          `from_state`,
          `to_state`,
          `document_id`,
          `metadata`,
          `timestamp`,
        ],
        properties: {
          id: { type: `string`, format: `uuid` },
          application_id: { type: `string`, format: `uuid` },
          actor_id: { type: `string`, format: `uuid` },
          actor: { $ref: `#/components/schemas/ApplicationComplianceAuditActor` },
          action_label: {
            type: `string`,
            description: `Human-readable description of the action (mapped from transitions or domain event codes).`,
            example: `Final License Approval`,
          },
          event_action: { type: `string`, nullable: true },
          from_state: {
            allOf: [{ $ref: `#/components/schemas/ApplicationStatus` }],
            nullable: true,
          },
          to_state: {
            allOf: [{ $ref: `#/components/schemas/ApplicationStatus` }],
            nullable: true,
          },
          document_id: { type: `string`, format: `uuid`, nullable: true },
          metadata: {
            type: `object`,
            nullable: true,
            additionalProperties: true,
            description: `For document upload/version events, includes **version** and **original_name** from stored file metadata.`,
          },
          timestamp: { type: `string`, format: `date-time` },
        },
      },
      ApplicationComplianceAuditLogsResponse: {
        type: `object`,
        required: [`success`, `data`],
        properties: {
          success: { type: `boolean`, example: true },
          data: {
            type: `array`,
            items: { $ref: `#/components/schemas/ApplicationComplianceAuditLogEntry` },
            description: `Newest audit entries first.`,
          },
        },
      },
      ApplicationSingleResponse: {
        type: `object`,
        required: [`success`, `data`],
        properties: {
          success: { type: `boolean`, example: true },
          data: { $ref: `#/components/schemas/ApplicationRecord` },
        },
      },
      TransitionApplicationStatusRequest: {
        type: `object`,
        required: [`targetStatus`, `expectedVersion`],
        properties: {
          targetStatus: { $ref: `#/components/schemas/ApplicationStatus` },
          expectedVersion: {
            type: `integer`,
            minimum: 0,
            description: `Must match the application's current version or the server responds with 409 CONFLICT.`,
          },
        },
      },
      ApplicationDocumentRecord: {
        type: `object`,
        properties: {
          id: { type: `string`, format: `uuid` },
          application_id: { type: `string`, format: `uuid` },
          group_key: {
            type: `string`,
            nullable: true,
            description: `Logical document family; when set, uploads advance **version** and **DOCUMENT_VERSION_UPDATED** audits.`,
          },
          version: { type: `integer`, minimum: 1 },
          is_current: {
            type: `boolean`,
            description: `Exactly one row per **group_key** is current when **group_key** is non-null.`,
          },
          file_path: { type: `string` },
          original_name: { type: `string` },
          mime_type: { type: `string` },
          size_bytes: { type: `integer` },
          uploader_id: { type: `string`, format: `uuid` },
        },
      },
      ApplicationDocumentsListResponse: {
        type: `object`,
        required: [`success`, `data`],
        properties: {
          success: { type: `boolean`, example: true },
          data: {
            type: `array`,
            items: { $ref: `#/components/schemas/ApplicationDocumentRecord` },
          },
        },
      },
      RegulatorySummaryApplicationsByStatus: {
        type: `object`,
        description: `Total applications per **ApplicationStatus** (dense map for charting).`,
        required: regulatorySummaryApplicationsByStatusRequired,
        properties: regulatorySummaryApplicationsByStatusProperties,
      },
      RegulatorySummaryUnderReviewMetrics: {
        type: `object`,
        required: [`averageDurationSeconds`, `completedCyclesCount`],
        properties: {
          averageDurationSeconds: {
            type: `number`,
            nullable: true,
            description: `Mean duration in seconds of completed **UNDER_REVIEW** spells derived from **audit_logs** (each transition into UNDER_REVIEW through the next transition). \`null\` when no completed spells exist.`,
          },
          completedCyclesCount: {
            type: `integer`,
            minimum: 0,
            description: `Number of completed UNDER_REVIEW spells used for the average.`,
          },
        },
      },
      RegulatorySummaryBottleneck: {
        type: `object`,
        required: [
          `applicationId`,
          `applicantId`,
          `status`,
          `firstAuditAt`,
          `ageSeconds`,
        ],
        properties: {
          applicationId: { type: `string`, format: `uuid` },
          applicantId: { type: `string`, format: `uuid` },
          status: { $ref: `#/components/schemas/ApplicationStatus` },
          firstAuditAt: {
            type: `string`,
            format: `date-time`,
            description: `Earliest **audit_logs.timestamp** for this application (proxy for intake / first movement).`,
          },
          ageSeconds: {
            type: `integer`,
            minimum: 0,
            description: `Seconds from **firstAuditAt** to **asOf** on the parent payload.`,
          },
        },
      },
      RegulatorySummary: {
        type: `object`,
        required: [
          `asOf`,
          `applicationsByStatus`,
          `underReview`,
          `topPendingBottlenecks`,
        ],
        properties: {
          asOf: {
            type: `string`,
            format: `date-time`,
            description: `Snapshot timestamp for time-based fields in this response.`,
          },
          applicationsByStatus: {
            $ref: `#/components/schemas/RegulatorySummaryApplicationsByStatus`,
          },
          underReview: {
            $ref: `#/components/schemas/RegulatorySummaryUnderReviewMetrics`,
          },
          topPendingBottlenecks: {
            type: `array`,
            description: `Up to five oldest **SUBMITTED**, **UNDER_REVIEW**, **PENDING_CLARIFICATION**, or **FINAL_REVIEW** applications by earliest audit activity (pipeline bottleneck signal).`,
            maxItems: 5,
            items: { $ref: `#/components/schemas/RegulatorySummaryBottleneck` },
          },
        },
      },
      RegulatorySummaryResponse: {
        type: `object`,
        required: [`success`, `data`],
        properties: {
          success: { type: `boolean`, example: true },
          data: { $ref: `#/components/schemas/RegulatorySummary` },
        },
      },
      DashboardStatusDistribution: {
        type: `object`,
        required: [`labels`, `values`, `byStatus`],
        description: `Chart-friendly series plus a dense map keyed by **ApplicationStatus**.`,
        properties: {
          labels: {
            type: `array`,
            items: { $ref: `#/components/schemas/ApplicationStatus` },
            description: `Status labels in enum order.`,
          },
          values: {
            type: `array`,
            items: { type: `integer`, minimum: 0 },
            description: `Counts aligned with **labels**.`,
          },
          byStatus: {
            $ref: `#/components/schemas/RegulatorySummaryApplicationsByStatus`,
          },
        },
      },
      DashboardReviewerWorkloadRow: {
        type: `object`,
        required: [`userId`, `name`, `email`, `assignedCount`],
        properties: {
          userId: { type: `string`, format: `uuid` },
          name: { type: `string` },
          email: { type: `string` },
          assignedCount: {
            type: `integer`,
            minimum: 0,
            description: `Applications with **reviewer_id** = this user (current assignments).`,
          },
        },
      },
      DashboardReviewerWorkload: {
        type: `object`,
        required: [`labels`, `values`, `reviewers`],
        properties: {
          labels: {
            type: `array`,
            items: { type: `string` },
            description: `Reviewer **name** values, aligned with **values**.`,
          },
          values: {
            type: `array`,
            items: { type: `integer`, minimum: 0 },
            description: `Assigned application counts per reviewer.`,
          },
          reviewers: {
            type: `array`,
            items: { $ref: `#/components/schemas/DashboardReviewerWorkloadRow` },
          },
        },
      },
      DashboardSubmittedToFinalReview: {
        type: `object`,
        required: [`averageHours`, `averageDays`, `sampleCount`],
        properties: {
          averageHours: {
            type: `number`,
            nullable: true,
            description: `Mean hours between first **SUBMITTED** and first **FINAL_REVIEW** audit timestamps per application (\`null\` when no samples).`,
          },
          averageDays: {
            type: `number`,
            nullable: true,
            description: `**averageHours / 24** for calendar-scale dashboards.`,
          },
          sampleCount: {
            type: `integer`,
            minimum: 0,
            description: `Applications that reached **FINAL_REVIEW** with a prior **SUBMITTED** audit row.`,
          },
        },
      },
      DashboardSecurityIntegrity: {
        type: `object`,
        required: [`blockedApprovalIdentityConflictCount`],
        properties: {
          blockedApprovalIdentityConflictCount: {
            type: `integer`,
            minimum: 0,
            description: `**audit_logs** rows with **APPROVAL_BLOCKED_REVIEWER_IDENTITY** (blocked final decision: actor was the assigned reviewer).`,
          },
        },
      },
      DashboardGlobalStats: {
        type: `object`,
        required: [
          `statusDistribution`,
          `reviewerWorkload`,
          `submittedToFinalReview`,
          `securityIntegrity`,
        ],
        properties: {
          statusDistribution: {
            $ref: `#/components/schemas/DashboardStatusDistribution`,
          },
          reviewerWorkload: {
            $ref: `#/components/schemas/DashboardReviewerWorkload`,
          },
          submittedToFinalReview: {
            $ref: `#/components/schemas/DashboardSubmittedToFinalReview`,
          },
          securityIntegrity: {
            $ref: `#/components/schemas/DashboardSecurityIntegrity`,
          },
        },
      },
      DashboardGlobalStatsResponse: {
        type: `object`,
        required: [`success`, `data`],
        properties: {
          success: { type: `boolean`, example: true },
          data: { $ref: `#/components/schemas/DashboardGlobalStats` },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: [`Health`],
        summary: `Service health`,
        responses: {
          '200': {
            description: `OK`,
            content: {
              'application/json': {
                schema: {
                  type: `object`,
                  properties: {
                    ok: { type: `boolean` },
                    service: { type: `string` },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/health': {
      get: {
        tags: [`Auth`],
        summary: `Auth module health`,
        responses: {
          '200': {
            description: `OK`,
            content: {
              'application/json': {
                schema: {
                  type: `object`,
                  properties: {
                    module: { type: `string` },
                    status: { type: `string` },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/signup': {
      post: {
        tags: [`Auth`],
        summary: `Register as applicant`,
        description: `Creates a user with the **APPLICANT** role from the database (roles are never taken from the request; response lists assigned role names).`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/SignupRequest` },
            },
          },
        },
        responses: {
          '201': {
            description: `User created`,
            content: {
              'application/json': {
                schema: {
                  type: `object`,
                  properties: {
                    success: { type: `boolean`, example: true },
                    user: { $ref: `#/components/schemas/PublicUser` },
                  },
                },
              },
            },
          },
          '400': {
            description: `Invalid payload`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '409': {
            description: `Email already registered`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: [`Auth`],
        summary: `Login`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/LoginRequest` },
            },
          },
        },
        responses: {
          '200': {
            description: `JWT issued`,
            content: {
              'application/json': {
                schema: {
                  type: `object`,
                  properties: {
                    success: { type: `boolean`, example: true },
                    token: { type: `string` },
                  },
                },
              },
            },
          },
          '403': {
            description: `Invalid credentials`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: [`Auth`],
        summary: `Current principal`,
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: `Profile from database (permissions merged from all roles assigned to the user)`,
            content: {
              'application/json': {
                schema: {
                  type: `object`,
                  properties: {
                    success: { type: `boolean` },
                    user: { $ref: `#/components/schemas/MeUser` },
                  },
                },
              },
            },
          },
          '403': {
            description: `Missing or invalid token`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
    '/api/auth/admin/promote/{userId}': {
      patch: {
        tags: [`Auth — Admin`],
        summary: `Add reviewer or approver role to user`,
        description: `Adds **REVIEWER** or **APPROVER** to the user's roles if missing (idempotent). Transactional promotion plus audit stub when a role was added. Requires **manage_users**.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: `userId`,
            in: `path`,
            required: true,
            schema: { type: `string`, format: `uuid` },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/PromoteUserRequest` },
            },
          },
        },
        responses: {
          '200': {
            description: `User promoted`,
            content: {
              'application/json': {
                schema: {
                  type: `object`,
                  properties: {
                    success: { type: `boolean` },
                    user: { $ref: `#/components/schemas/PublicUser` },
                  },
                },
              },
            },
          },
          '400': {
            description: `Invalid patch body`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '403': {
            description: `Missing token, invalid token, or insufficient permissions`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '404': {
            description: `User not found`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
    '/api/auth/admin/users': {
      get: {
        tags: [`Auth — Admin`],
        summary: `List users`,
        description: `Paged list of accounts (no passwords). Requires **manage_users**.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: `page`,
            in: `query`,
            required: false,
            schema: {
              type: `integer`,
              minimum: 1,
              maximum: 10_000,
              default: 1,
            },
          },
          {
            name: `limit`,
            in: `query`,
            required: false,
            schema: {
              type: `integer`,
              minimum: 1,
              maximum: 100,
              default: 50,
            },
          },
        ],
        responses: {
          '200': {
            description: `Users page`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/AdminUsersListResponse` },
              },
            },
          },
          '400': {
            description: `Invalid query`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '403': {
            description: `Missing token, invalid token, or insufficient permissions`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
    '/api/auth/admin/create-reviewer': {
      post: {
        tags: [`Auth — Admin`],
        summary: `Create reviewer account`,
        description: `Creates a user with the **REVIEWER** role. Requires **manage_users**.`,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/CreateReviewerRequest` },
            },
          },
        },
        responses: {
          '201': {
            description: `Reviewer created`,
            content: {
              'application/json': {
                schema: {
                  type: `object`,
                  properties: {
                    success: { type: `boolean` },
                    user: { $ref: `#/components/schemas/PublicUser` },
                  },
                },
              },
            },
          },
          '400': {
            description: `Invalid payload`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '403': {
            description: `Auth or permission failure`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '409': {
            description: `Email already registered`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
    '/api/applications': {
      get: {
        tags: [`Applications`],
        summary: `List applications`,
        description: `**Applicants** receive only applications where **applicant_id** matches the JWT subject. **Reviewer**, **Approver**, and **Admin** roles receive all applications.`,
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: `Applications visible to the caller`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ApplicationsListResponse` },
              },
            },
          },
          '403': {
            description: `Missing or invalid token`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
      post: {
        tags: [`Applications`],
        summary: `Create application (DRAFT)`,
        description: `Creates a new application owned by the authenticated user (**applicant_id** = JWT subject).`,
        security: [{ bearerAuth: [] }],
        responses: {
          '201': {
            description: `Draft created`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ApplicationSingleResponse` },
              },
            },
          },
          '403': {
            description: `Missing or invalid token`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
    '/api/applications/{id}/audit-logs': {
      get: {
        tags: [`Compliance — Audit`],
        summary: `List compliance audit history for an application`,
        description: `**Protected compliance route** — for regulatory oversight and internal review. Returns audit rows with actor identity (**name**, highest **role** seniority) and human-readable **action_label** values. **Applicants** are denied: only **REVIEWER**, **APPROVER**, and **ADMIN** may call this endpoint. Ordering: newest first. Document-related entries enrich **metadata** with **version** and **original_name**. Requires JWT.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: `id`,
            in: `path`,
            required: true,
            schema: { type: `string`, format: `uuid` },
            description: `Application id`,
          },
        ],
        responses: {
          '200': {
            description: `Audit log entries (newest first)`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ApplicationComplianceAuditLogsResponse` },
              },
            },
          },
          '403': {
            description: `Missing or invalid token, or caller is not REVIEWER, APPROVER, or ADMIN`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '404': {
            description: `Application not found`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
    '/api/applications/{id}': {
      get: {
        tags: [`Applications`],
        summary: `Get application and audit trail`,
        description: `Returns application fields plus **auditLogs** ordered oldest-first. Subject to the same visibility rules as the list endpoint.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: `id`,
            in: `path`,
            required: true,
            schema: { type: `string`, format: `uuid` },
          },
        ],
        responses: {
          '200': {
            description: `Application detail`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ApplicationDetailResponse` },
              },
            },
          },
          '403': {
            description: `Missing or invalid token, or caller cannot access this application`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '404': {
            description: `Application not found`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
    '/api/applications/{id}/documents': {
      get: {
        tags: [`Applications`],
        summary: `List documents for an application`,
        description: `Returns **is_current** rows only unless **includeHistory=true** (full version chain per **group_key**). Same visibility rules as GET application detail.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: `id`,
            in: `path`,
            required: true,
            schema: { type: `string`, format: `uuid` },
          },
          {
            name: `includeHistory`,
            in: `query`,
            required: false,
            schema: { type: `string`, enum: [`true`, `false`] },
            description: `When \`true\`, includes superseded versions (**is_current**: false).`,
          },
        ],
        responses: {
          '200': {
            description: `Documents for the application`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ApplicationDocumentsListResponse` },
              },
            },
          },
          '403': {
            description: `Caller cannot access this application`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '404': {
            description: `Application not found`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
    '/api/applications/{id}/status': {
      patch: {
        tags: [`Applications`],
        summary: `Transition application status`,
        description: `Runs one validated workflow step (see Design state machine). Requires JWT and permission tokens for the requested transition. When **targetStatus** is **APPROVED**, the caller must also satisfy **application:approve** at the route layer. Uses optimistic locking via **expectedVersion**, separation-of-duties on APPROVED/REJECTED (assigned reviewer cannot be the actor), and appends an **audit_logs** row in the same database transaction.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: `id`,
            in: `path`,
            required: true,
            schema: { type: `string`, format: `uuid` },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/TransitionApplicationStatusRequest` },
            },
          },
        },
        responses: {
          '200': {
            description: `Status updated`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ApplicationSingleResponse` },
              },
            },
          },
          '400': {
            description: `Invalid path, body, or disallowed transition for current status`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '403': {
            description: `Missing or invalid token, insufficient permission for **APPROVED** target, insufficient permission token for this transition, or reviewer attempted final approval/rejection`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '404': {
            description: `Application not found`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '409': {
            description: `Version mismatch (concurrent update)`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
    '/api/applications/health': {
      get: {
        tags: [`Applications`],
        summary: `Applications module health`,
        responses: {
          '200': {
            description: `OK`,
            content: {
              'application/json': {
                schema: {
                  type: `object`,
                  properties: {
                    module: { type: `string` },
                    status: { type: `string` },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/audit/health': {
      get: {
        tags: [`Audit`],
        summary: `Audit module health (stub)`,
        responses: {
          '200': {
            description: `OK`,
            content: {
              'application/json': {
                schema: {
                  type: `object`,
                  properties: {
                    module: { type: `string` },
                    status: { type: `string` },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/audit/logs': {
      get: {
        tags: [`Audit`],
        summary: `List audit logs (admin, filtered)`,
        description: `**ADMIN only.** Returns audit log entries across all applications, newest first, with the same enriched shape as compliance audit views (**action_label**, **actor**, document **metadata**). Filters are combined with **AND**. \`applicant_id\`, \`reviewer_id\`, and \`approver_id\` match the corresponding columns on **applications** (assigned reviewer / deciding approver). \`document_id\` filters **audit_logs.document_id**. \`limit\` caps result size (default 500, max 2000).`,
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: `applicant_id`,
            in: `query`,
            required: false,
            schema: { type: `string`, format: `uuid` },
          },
          {
            name: `reviewer_id`,
            in: `query`,
            required: false,
            schema: { type: `string`, format: `uuid` },
            description: `Matches **applications.reviewer_id** (assigned reviewer).`,
          },
          {
            name: `approver_id`,
            in: `query`,
            required: false,
            schema: { type: `string`, format: `uuid` },
            description: `Matches **applications.approver_id**.`,
          },
          {
            name: `document_id`,
            in: `query`,
            required: false,
            schema: { type: `string`, format: `uuid` },
          },
          {
            name: `limit`,
            in: `query`,
            required: false,
            schema: {
              type: `integer`,
              minimum: 1,
              maximum: 2000,
              default: 500,
            },
          },
        ],
        responses: {
          '200': {
            description: `Audit entries`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ApplicationComplianceAuditLogsResponse` },
              },
            },
          },
          '400': {
            description: `Invalid query`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '403': {
            description: `Missing or invalid token, or caller is not ADMIN`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
    '/api/analytics/summary': {
      get: {
        tags: [`Executive Oversight Analytics`],
        summary: `Regulatory summary dashboard`,
        description: `**Executive Oversight Analytics** — **ADMIN** only. Aggregated licensing metrics for regulatory dashboards: totals by status, historical mean time in **UNDER_REVIEW** (from audit transitions), and the five oldest in-flight pipeline applications.`,
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: `Regulatory summary snapshot`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/RegulatorySummaryResponse` },
              },
            },
          },
          '403': {
            description: `Missing or invalid token, or caller is not ADMIN`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
    '/api/admin/dashboard-stats': {
      get: {
        tags: [`Regulatory Oversight Dashboard`],
        summary: `Supervisor dashboard statistics`,
        description: `**Regulatory Oversight Dashboard** — requires permission **analytics:view_dashboard** (seeded on **ADMIN** and **APPROVER** roles). Returns chart-oriented aggregates: application counts by status, per-reviewer assignment load, mean lag from **SUBMITTED** to **FINAL_REVIEW** from **audit_logs**, and count of blocked approvals where the actor matched the assigned reviewer (**APPROVAL_BLOCKED_REVIEWER_IDENTITY**).`,
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: `Dashboard aggregates`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/DashboardGlobalStatsResponse` },
              },
            },
          },
          '403': {
            description: `Missing or invalid token, or missing **analytics:view_dashboard**`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
    '/api/documents/health': {
      get: {
        tags: [`Documents`],
        summary: `Documents module health`,
        responses: {
          '200': {
            description: `OK`,
            content: {
              'application/json': {
                schema: {
                  type: `object`,
                  properties: {
                    module: { type: `string` },
                    status: { type: `string` },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/documents/{applicationId}': {
      post: {
        tags: [`Documents`],
        summary: `Upload a document for an application`,
        description: `Multipart upload (field **file**; optional **group_key** text field). Allowed only while the application is **DRAFT** or **PENDING_CLARIFICATION** and only for the owning applicant. Stored filename is a UUID under **uploads/**. Without **group_key**, writes **DOCUMENT_UPLOADED** and **version** 1. With **group_key**, bumps **version**, clears **is_current** on prior rows in that group, sets **DOCUMENT_VERSION_UPDATED** audit **metadata** (\`group_key\`, \`version\`), all in one transaction.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: `applicationId`,
            in: `path`,
            required: true,
            schema: { type: `string`, format: `uuid` },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: `object`,
                required: [`file`],
                properties: {
                  file: {
                    type: `string`,
                    format: `binary`,
                  },
                  group_key: {
                    type: `string`,
                    description: `When provided, starts or continues a version chain for this logical document (e.g. license_pdf).`,
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: `Document persisted`,
            content: {
              'application/json': {
                schema: {
                  type: `object`,
                  required: [`success`, `data`],
                  properties: {
                    success: { type: `boolean`, example: true },
                    data: {
                      type: `object`,
                      properties: {
                        id: { type: `string`, format: `uuid` },
                        application_id: { type: `string`, format: `uuid` },
                        group_key: { type: `string`, nullable: true },
                        version: { type: `integer` },
                        is_current: { type: `boolean` },
                        file_path: { type: `string` },
                        original_name: { type: `string` },
                        mime_type: { type: `string` },
                        size_bytes: { type: `integer` },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: `Validation error`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '403': {
            description: `Not allowed (wrong user or application state)`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '404': {
            description: `Application not found`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '413': {
            description: `File too large`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
    '/api/documents/{id}/download': {
      get: {
        tags: [`Documents`],
        summary: `Download a stored document`,
        description: `Applicant may download documents tied to their applications; **REVIEWER** and **APPROVER** may download any stored document.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: `id`,
            in: `path`,
            required: true,
            schema: { type: `string`, format: `uuid` },
          },
        ],
        responses: {
          '200': {
            description: `File stream`,
            content: {
              'application/octet-stream': {
                schema: { type: `string`, format: `binary` },
              },
            },
          },
          '403': {
            description: `Not allowed`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
          '404': {
            description: `Document not found`,
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/ErrorBody` },
              },
            },
          },
        },
      },
    },
  },
};
