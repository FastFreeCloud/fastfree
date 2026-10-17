/**
 * Success envelope. Every 2xx JSON response uses this shape so the SPA has one
 * place to unwrap.
 */

export interface ApiSuccessBody<TData> {
  data: TData;
}

export function ok<TData>(data: TData): ApiSuccessBody<TData> {
  return { data };
}