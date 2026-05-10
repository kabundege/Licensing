import { describe, expect, it } from 'vitest';

import type { OpenAPIV3 } from 'openapi-types';

import { openApiDocument } from '../openapi';
import { ApplicationStatus } from '../../modules/applications/entities';

describe(`openApiDocument — Applications`, () => {
  it(`documents PATCH /api/applications/{applicationId}/status`, () => {
    const pathItem = openApiDocument.paths?.[`/api/applications/{applicationId}/status`];
    expect(pathItem?.patch).toBeDefined();
    expect(pathItem?.patch?.security).toEqual([{ bearerAuth: [] }]);
    expect(pathItem?.patch?.responses?.[`200`]).toBeDefined();
    expect(pathItem?.patch?.responses?.[`409`]).toBeDefined();
  });

  it(`defines transition request/response schemas`, () => {
    const schemas = openApiDocument.components?.schemas ?? {};
    expect(schemas.TransitionApplicationStatusRequest).toBeDefined();
    expect(schemas.TransitionApplicationStatusResponse).toBeDefined();
    expect(schemas.ApplicationRecord).toBeDefined();
  });

  it(`ApplicationStatus enum matches domain values`, () => {
    const schema = openApiDocument.components?.schemas?.ApplicationStatus as
      | OpenAPIV3.SchemaObject
      | undefined;
    expect(schema?.type).toBe(`string`);
    expect([...(schema?.enum ?? [])].sort()).toEqual(
      [...Object.values(ApplicationStatus)].sort()
    );
  });
});
