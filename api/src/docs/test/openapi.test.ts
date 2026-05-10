import { describe, expect, it } from 'vitest';

import type { OpenAPIV3 } from 'openapi-types';

import { openApiDocument } from '../openapi';
import { ApplicationStatus } from '../../modules/applications/entities';

describe(`openApiDocument — Applications`, () => {
  it(`documents CRUD-style application routes`, () => {
    expect(openApiDocument.paths?.[`/api/applications`]?.get).toBeDefined();
    expect(openApiDocument.paths?.[`/api/applications`]?.post).toBeDefined();
    expect(openApiDocument.paths?.[`/api/applications/{id}`]?.get).toBeDefined();
    const patchItem = openApiDocument.paths?.[`/api/applications/{id}/status`];
    expect(patchItem?.patch).toBeDefined();
    expect(patchItem?.patch?.security).toEqual([{ bearerAuth: [] }]);
    expect(patchItem?.patch?.responses?.[`200`]).toBeDefined();
    expect(patchItem?.patch?.responses?.[`409`]).toBeDefined();
  });

  it(`defines transition request and envelope response schemas`, () => {
    const schemas = openApiDocument.components?.schemas ?? {};
    expect(schemas.TransitionApplicationStatusRequest).toBeDefined();
    expect(schemas.ApplicationSingleResponse).toBeDefined();
    expect(schemas.ApplicationRecord).toBeDefined();
    expect(schemas.ApplicationDetailResponse).toBeDefined();
    expect(schemas.ApplicationsListResponse).toBeDefined();
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

describe(`openApiDocument — Executive Oversight Analytics`, () => {
  it(`documents regulatory summary route as admin-only dashboard`, () => {
    const get = openApiDocument.paths?.[`/api/analytics/summary`]?.get;
    expect(get).toBeDefined();
    expect(get?.tags).toContain(`Executive Oversight Analytics`);
    expect(get?.security).toEqual([{ bearerAuth: [] }]);
    expect(get?.responses?.[`200`]).toBeDefined();
    expect(get?.responses?.[`403`]).toBeDefined();
    expect(
      openApiDocument.components?.schemas?.RegulatorySummaryResponse
    ).toBeDefined();
  });
});

describe(`openApiDocument — Regulatory Oversight Dashboard`, () => {
  it(`documents supervisor dashboard-stats route`, () => {
    const get = openApiDocument.paths?.[`/api/admin/dashboard-stats`]?.get;
    expect(get).toBeDefined();
    expect(get?.tags).toContain(`Regulatory Oversight Dashboard`);
    expect(get?.security).toEqual([{ bearerAuth: [] }]);
    expect(get?.responses?.[`200`]).toBeDefined();
    expect(
      openApiDocument.components?.schemas?.DashboardGlobalStatsResponse
    ).toBeDefined();
  });
});
