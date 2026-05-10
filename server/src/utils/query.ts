/** Cast Express 5 query param (string | string[] | undefined) to plain string */
export function q(val: any): string {
  return Array.isArray(val) ? val[0] || '' : String(val ?? '');
}
