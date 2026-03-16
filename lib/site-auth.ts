export const SITE_AUTH_COOKIE = "sunjae_site_access";
const AUTH_NAMESPACE = "sunjae-care-log";

async function sha256(input: string) {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createSiteAccessToken(password: string) {
  return sha256(`${AUTH_NAMESPACE}:${password}`);
}

export async function isValidSiteAccessToken(cookieValue?: string | null) {
  const password = process.env.SITE_PASSWORD;

  if (!password) {
    return true;
  }

  if (!cookieValue) {
    return false;
  }

  const expected = await createSiteAccessToken(password);
  return cookieValue === expected;
}

