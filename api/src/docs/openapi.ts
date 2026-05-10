import type { OpenAPIV3 } from 'openapi-types';

import { env } from '../config/env';
import { ApplicationStatus } from '../modules/applications/entities';

const applicationStatusEnum = Object.values(ApplicationStatus);

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
    { name: `Applications`, description: `License applications — status transitions (RBAC + optimistic locking) and module health` },
    { name: `Audit`, description: `Audit trail (stub)` },
    { name: `Documents`, description: `Document upload (stub)` },
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
        required: [
          `id`,
          `application_id`,
          `actor_id`,
          `from_state`,
          `to_state`,
          `timestamp`,
        ],
        properties: {
          id: { type: `string`, format: `uuid` },
          application_id: { type: `string`, format: `uuid` },
          actor_id: { type: `string`, format: `uuid` },
          from_state: { $ref: `#/components/schemas/ApplicationStatus` },
          to_state: { $ref: `#/components/schemas/ApplicationStatus` },
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
    '/api/documents/health': {
      get: {
        tags: [`Documents`],
        summary: `Documents module health (stub)`,
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
    '/api/documents/upload-demo': {
      post: {
        tags: [`Documents`],
        summary: `Multipart upload demo`,
        description: `Smoke test for multer; max file size enforced by middleware (5MB).`,
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
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: `File stored under uploads/`,
            content: {
              'application/json': {
                schema: {
                  type: `object`,
                  properties: {
                    ok: { type: `boolean` },
                    storedAs: { type: `string`, nullable: true },
                    note: { type: `string` },
                  },
                },
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
  },
};
