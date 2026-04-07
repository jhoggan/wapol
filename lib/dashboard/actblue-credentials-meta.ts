/** Shape of `committee_actblue_credentials_meta` RPC (jsonb). */
export type ActBlueCredentialsMeta = {
  configured: boolean;
  secretLastFour: string | null;
};

export function parseActBlueCredentialsMeta(
  raw: unknown
): ActBlueCredentialsMeta {
  if (!raw || typeof raw !== "object") {
    return { configured: false, secretLastFour: null };
  }
  const o = raw as Record<string, unknown>;
  const last =
    typeof o.secret_last_four === "string" ? o.secret_last_four : null;
  return {
    configured: o.configured === true,
    secretLastFour: last,
  };
}
