import type { OpenAPIV3 } from 'openapi-types';

import { env } from '../config/env';

export const openApiDocument: OpenAPIV3.Document = {
  openapi: `3.0.3`,
  info: {
    title: `BNR Licensing API`,
    description: `Bank licensing and compliance portal API. Authenticated routes use a Bearer JWT from \`POST /api/auth/login\`. Admin routes require the \`manage_users\` permission (Admin role).`,
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
    { name: `Applications`, description: `License applications (stub)` },
    { name: `Audit`, description: `Audit trail (stub)` },
    { name: `Documents`, description: `Document upload (stub)` },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: `http`,
        scheme: `bearer`,
        bearerFormat: `JWT`,
        description: `JWT from \`/api/auth/login\` (\`Authorization: Bearer <token>\`)`,
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
          role: {
            type: `string`,
            enum: [`APPLICANT`, `REVIEWER`, `APPROVER`, `ADMIN`],
          },
        },
      },
      MeUser: {
        type: `object`,
        properties: {
          id: { type: `string`, format: `uuid` },
          email: { type: `string` },
          role: {
            type: `string`,
            enum: [`APPLICANT`, `REVIEWER`, `APPROVER`, `ADMIN`],
          },
          permissions: {
            type: `array`,
            items: { type: `string` },
            description: `Permission tokens derived from role (e.g. manage_users, users:manage_users)`,
          },
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
        description: `Creates a user with the **APPLICANT** role from the database (role is never taken from the request).`,
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
            description: `Profile from database (permissions reflect current role)`,
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
        summary: `Promote user to reviewer`,
        description: `Transactional role update plus audit stub. Requires **manage_users**.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: `userId`,
            in: `path`,
            required: true,
            schema: { type: `string`, format: `uuid` },
          },
        ],
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
    '/api/applications/health': {
      get: {
        tags: [`Applications`],
        summary: `Applications module health (stub)`,
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
