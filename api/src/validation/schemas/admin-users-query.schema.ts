import * as yup from 'yup';

export type AdminUsersQueryDto = {
  page: number;
  limit: number;
};

export const adminUsersQuerySchema = yup
  .object({
    page: yup.mixed<string | number>().optional(),
    limit: yup.mixed<string | number>().optional(),
  })
  .transform((root) => {
    const coerce = (
      raw: unknown,
      fallback: number,
      min: number,
      max: number
    ): number => {
      if (raw === undefined || raw === null || raw === '') {
        return fallback;
      }
      const n =
        typeof raw === `number` && Number.isFinite(raw)
          ? raw
          : Number(String(raw).trim());
      if (!Number.isFinite(n)) {
        return NaN;
      }
      const i = Math.trunc(n);
      if (i < min || i > max) {
        return NaN;
      }
      return i;
    };
    return {
      page: coerce(root.page, 1, 1, 10_000),
      limit: coerce(root.limit, 50, 1, 100),
    };
  })
  .test(
    `query-bounds`,
    `page must be an integer between 1 and 10000, limit between 1 and 100`,
    (value): value is AdminUsersQueryDto =>
      !!value &&
      typeof value.page === `number` &&
      !Number.isNaN(value.page) &&
      typeof value.limit === `number` &&
      !Number.isNaN(value.limit)
  );
