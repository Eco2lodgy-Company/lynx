/**
 * Helper to build API URLs that respect the Next.js basePath.
 * In a sub-directory deployment (e.g., /lynx), the browser's native fetch()
 * does NOT automatically prepend the basePath. This utility ensures all
 * client-side API calls target the correct URL.
 */

const BASE_PATH = "/lynx";

export function apiUrl(path: string): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${BASE_PATH}${normalizedPath}`;
}
