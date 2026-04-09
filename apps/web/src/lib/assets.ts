/**
 * Prefix a relative URL with the deployment basePath (/lynx).
 * Use this for any static asset URL stored in the database
 * (uploads, avatars, etc.) that is rendered via native <img> tags.
 *
 * If the URL is already absolute (http/https) or already
 * starts with the basePath, it is returned unchanged.
 */
const BASE_PATH = "/lynx";

export function assetUrl(url: string | null | undefined): string {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith(BASE_PATH)) return url;
    return `${BASE_PATH}${url.startsWith("/") ? "" : "/"}${url}`;
}
