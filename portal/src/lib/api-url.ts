export const getApiBaseUrl = (): string => {
  const url = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      `Missing API_URL (or NEXT_PUBLIC_API_URL). Set the Express API base URL in .env.local`
    );
  }
  return url.replace(/\/$/, ``);
};
