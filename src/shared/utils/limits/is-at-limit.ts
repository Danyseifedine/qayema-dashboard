/**
 * Whether a package's allowance is used up, for the Add button beside its
 * `LimitNotice`; an unlimited one (a null limit) never is.
 */
export function isAtLimit(meta: { used: number; limit: number | null } | undefined): boolean {
  return meta !== undefined && meta.limit !== null && meta.used >= meta.limit
}
