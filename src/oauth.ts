/**
 * OAuth wrapper for AT Protocol authentication using atcute
 *
 * Usage:
 *   import { initOAuth, login, logout, getAgent, isLoggedIn } from './oauth';
 *
 *   // On app load
 *   await initOAuth(config);
 *
 *   // To login
 *   await login('user.bsky.social');
 *
 *   // Check auth state
 *   if (isLoggedIn()) {
 *     const agent = getAgent();
 *     // use agent to create records
 *   }
 */

import {
  configureOAuth,
  defaultIdentityResolver,
  createAuthorizationUrl,
  finalizeAuthorization,
  OAuthUserAgent
} from '@atcute/oauth-browser-client';
import {
  XrpcHandleResolver,
  CompositeDidDocumentResolver,
  PlcDidDocumentResolver,
  WebDidDocumentResolver
} from '@atcute/identity-resolver';
import { Client } from '@atcute/client';
import { getPdsEndpoint } from '@atcute/identity';
import type { OAuthConfig, OAuthSession, ATClientOptions } from './types';

let oauthConfig: OAuthConfig | null = null;
let currentAgent: OAuthUserAgent | null = null;
let currentSession: OAuthSession | null = null;
let identityResolver: ReturnType<typeof defaultIdentityResolver> | null = null;

/**
 * Initialize OAuth configuration
 */
export async function initOAuth(config: OAuthConfig) {
  oauthConfig = config;

  // Configure identity resolver with the defaultIdentityResolver wrapper
  identityResolver = defaultIdentityResolver({
    handleResolver: new XrpcHandleResolver({
      serviceUrl: 'https://public.api.bsky.app'
    }),
    didDocumentResolver: new CompositeDidDocumentResolver({
      methods: {
        plc: new PlcDidDocumentResolver(),
        web: new WebDidDocumentResolver()
      }
    })
  });

  // Configure OAuth
  configureOAuth({
    metadata: {
      client_id: config.oauth.clientId,
      redirect_uri: config.oauth.redirectUri
    },
    identityResolver
  });

  // Check for OAuth callback
  await handleOAuthCallback();
}

/**
 * Handle OAuth callback if present in URL
 */
async function handleOAuthCallback() {
  // Check both hash fragment and query parameters
  let params: URLSearchParams | null = null;
  let hadHash = false;
  
  // Try hash fragment first (OAuth implicit flow)
  if (location.hash.length > 1) {
    params = new URLSearchParams(location.hash.slice(1));
    hadHash = true;
  }
  // Fall back to query parameters (OAuth authorization code flow)
  else if (location.search.length > 1) {
    params = new URLSearchParams(location.search.slice(1));
  }
  
  if (!params || (!params.has('state') || (!params.has('code') && !params.has('error')))) {
    return;
  }

  // Check for error in callback
  if (params.has('error')) {
    const error = params.get('error');
    const errorDescription = params.get('error_description') || error;
    console.error('OAuth error in callback:', error, errorDescription);
    
    // Clean up URL
    history.replaceState(null, '', location.pathname);
    
    window.dispatchEvent(new CustomEvent('auth-error', {
      detail: { error: new Error(errorDescription || 'OAuth authorization failed') }
    }));
    return;
  }

  try {
    // Don't clean up URL until after successful authorization
    // This ensures state validation can access the URL if needed
    const result = await finalizeAuthorization(params) as { session: OAuthSession };
    const session = result.session as OAuthSession;
    currentSession = session;
    currentAgent = new OAuthUserAgent(session as unknown as OAuthSession);

    // Clean up URL after successful authorization
    history.replaceState(null, '', location.pathname);

    // Dispatch event for UI to update
    window.dispatchEvent(new CustomEvent('auth-change', {
      detail: { loggedIn: true, did: currentSession.info.sub }
    }));
  } catch (error) {
    // Clean up URL even on error to prevent retry loops
    history.replaceState(null, '', location.pathname);
    
    // Check if it's a stale state error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('unknown state') || errorMessage.includes('state')) {
      console.warn('OAuth callback with stale state - this may be from a previous session. Ignoring.');
      // Don't dispatch error for stale states - user can try logging in again
      return;
    }
    
    console.error('OAuth callback failed:', error);
    window.dispatchEvent(new CustomEvent('auth-error', {
      detail: { error }
    }));
  }
}

/**
 * Start login flow
 */
export async function login(handle: string) {
  if (!oauthConfig) {
    throw new Error('OAuth not initialized');
  }

  const authUrl = await createAuthorizationUrl({
    target: { type: 'account', identifier: handle },
    scope: oauthConfig.oauth.scope || 'atproto transition:generic'
  });

  // Small delay to allow state persistence
  await new Promise(resolve => setTimeout(resolve, 200));

  // Redirect to auth
  window.location.assign(authUrl);
}

/**
 * Logout
 */
export function logout() {
  currentAgent = null;
  currentSession = null;

  window.dispatchEvent(new CustomEvent('auth-change', {
    detail: { loggedIn: false, did: null }
  }));
}

/**
 * Check if user is logged in
 */
export function isLoggedIn() {
  return currentAgent !== null;
}

/**
 * Get current OAuth agent for making authenticated requests
 */
export function getAgent() {
  return currentAgent;
}

/**
 * Get current session info
 */
export function getSession() {
  return currentSession;
}

/**
 * Get current user's DID
 */
export function getCurrentDid() {
  return currentSession?.info?.sub || null;
}

/**
 * Create a record in the user's repo
 */
export async function createRecord(collection: string, record: unknown) {
  if (!currentAgent) {
    throw new Error('Not logged in');
  }
  if (!currentSession) {
    throw new Error('Missing OAuth session');
  }

  // Resolve PDS endpoint to ensure client uses correct service
  let pdsUrl: string | undefined;
  try {
    if (identityResolver) {
      const resolved = await identityResolver.resolve(currentSession.info.sub);
      if (resolved?.pds) {
        // Ensure URL is properly formatted (remove trailing slash if present)
        pdsUrl = resolved.pds.replace(/\/$/, '');
      }
    }
  } catch (error) {
    console.warn('Failed to resolve PDS for createRecord, client will use default:', error);
  }

  // Create client with explicit service URL if we have it
  const clientOptions: ATClientOptions = { handler: currentAgent };
  if (pdsUrl) {
    clientOptions.serviceUrl = pdsUrl;
  }

  const client = new Client(clientOptions);

  try {
    // Use post() for procedures (createRecord is a procedure)
    const response = await client.post('com.atproto.repo.createRecord', {
      input: {
        repo: currentSession.info.sub,
        collection,
        record
      }
    });

    if (!response.ok) {
      const errorMsg = response.data?.message || response.data?.error || 'Unknown error';
      throw new Error(`Failed to create record: ${errorMsg}`);
    }

    return response.data;
  } catch (error) {
    console.error('createRecord error:', error);
    throw error;
  }
}

/**
 * Update a record in the user's repo
 */
export async function putRecord(collection: string, rkey: string, record: unknown) {
  if (!currentAgent) {
    throw new Error('Not logged in');
  }
  if (!currentSession) {
    throw new Error('Missing OAuth session');
  }

  // Resolve PDS endpoint to ensure client uses correct service
  let pdsUrl: string | undefined;
  try {
    if (identityResolver) {
      const resolved = await identityResolver.resolve(currentSession.info.sub);
      if (resolved?.pds) {
        pdsUrl = resolved.pds;
      }
    }
  } catch (error) {
    console.warn('Failed to resolve PDS for putRecord, client will use default:', error);
  }

  // Create client with explicit service URL if we have it
  const clientOptions: ATClientOptions = { handler: currentAgent };
  if (pdsUrl) {
    clientOptions.serviceUrl = pdsUrl;
  }

  const client = new Client(clientOptions);

  // Use post() for procedures (putRecord is a procedure)
  const response = await client.post('com.atproto.repo.putRecord', {
    input: {
      repo: currentSession.info.sub,
      collection,
      rkey,
      record
    }
  });

  if (!response.ok) {
    const errorMsg = response.data?.message || response.data?.error || 'Unknown error';
    throw new Error(`Failed to update record: ${errorMsg}`);
  }

  return response.data;
}

/**
 * Delete a record from the user's repo
 */
export async function deleteRecord(collection: string, rkey: string) {
  if (!currentAgent) {
    throw new Error('Not logged in');
  }
  if (!currentSession) {
    throw new Error('Missing OAuth session');
  }

  // Resolve PDS endpoint to ensure client uses correct service
  let pdsUrl: string | undefined;
  try {
    if (identityResolver) {
      const resolved = await identityResolver.resolve(currentSession.info.sub);
      if (resolved?.pds) {
        pdsUrl = resolved.pds;
      }
    }
  } catch (error) {
    console.warn('Failed to resolve PDS for deleteRecord, client will use default:', error);
  }

  // Create client with explicit service URL if we have it
  const clientOptions: ATClientOptions = { handler: currentAgent };
  if (pdsUrl) {
    clientOptions.serviceUrl = pdsUrl;
  }

  const client = new Client(clientOptions);

  // Use post() for procedures (deleteRecord is a procedure)
  const response = await client.post('com.atproto.repo.deleteRecord', {
    input: {
      repo: currentSession.info.sub,
      collection,
      rkey
    }
  });

  if (!response.ok) {
    const errorMsg = response.data?.message || response.data?.error || 'Unknown error';
    throw new Error(`Failed to delete record: ${errorMsg}`);
  }
}
