/**
 * Utility functions for user identity (handles, DIDs, display names)
 */

/**
 * Get a safe handle for display, falling back to DID if handle is invalid or missing.
 */
export function getSafeHandle(handle: string | undefined | null, did: string): string {
    if (!handle || handle === 'handle.invalid') {
        return did;
    }
    return handle;
}

/**
 * Get a truncated DID for shorter display
 */
export function truncateDid(did: string): string {
    return did.length > 20 ? `${did.substring(0, 20)}...` : did;
}

/**
 * Get the best display identifier (handle or truncated DID)
 */
export function getDisplayHandle(handle: string | undefined | null, did: string): string {
    const safe = getSafeHandle(handle, did);
    return safe === did ? truncateDid(did) : `@${safe}`;
}

/**
 * Get a display name with fallback to handle or DID
 */
export function getDisplayName(profile: { displayName?: string, handle?: string } | null | undefined, did: string): string {
    const safeHandle = getSafeHandle(profile?.handle, did);
    // If the handle is the DID, we might want to truncate it for the label name if no displayName is present
    const fallback = safeHandle === did ? truncateDid(did) : safeHandle;
    return profile?.displayName || fallback;
}
