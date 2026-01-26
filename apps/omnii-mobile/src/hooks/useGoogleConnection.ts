/**
 * useGoogleConnection Hook
 *
 * Manages Google service connections via MCP backend's Composio OAuth.
 * This hook provides state and actions for connecting/disconnecting
 * Google services (Calendar, Tasks, Gmail, Contacts) from the mobile app.
 *
 * @example
 * const { connect, disconnect, connections, isLoading } = useGoogleConnection();
 */

import { useState, useCallback, useEffect } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '~/lib/supabase';
import { getMcpBaseUrl } from '~/lib/env';
import { useAuth } from '~/context/AuthContext';

// Google service types
export type GoogleService = 'calendar' | 'tasks' | 'gmail' | 'contacts';

// Connection status per service
export interface ServiceConnection {
  service: GoogleService;
  isConnected: boolean;
  lastSync?: string;
  itemsSynced?: number;
  status?: 'active' | 'syncing' | 'error' | 'pending';
  error?: string;
}

// Overall connection state
export interface GoogleConnectionState {
  isLoading: boolean;
  isConnecting: boolean;
  error: string | null;
  connections: ServiceConnection[];
  overallStatus: 'disconnected' | 'partial' | 'connected';
}

/**
 * Hook for managing Google service connections.
 *
 * Uses the MCP backend's /api/ingestion endpoints to:
 * - Initiate OAuth connection via Composio
 * - Check connection status per service
 * - Disconnect services
 * - Trigger manual sync per service
 */
export function useGoogleConnection() {
  const { user } = useAuth();
  const [state, setState] = useState<GoogleConnectionState>({
    isLoading: true,
    isConnecting: false,
    error: null,
    connections: [],
    overallStatus: 'disconnected',
  });

  // Get auth token for API calls
  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  // Build API URL
  const apiUrl = (path: string) => {
    const baseUrl = getMcpBaseUrl();
    return `${baseUrl.replace(/\/$/, '')}${path}`;
  };

  // Fetch current connection status
  const fetchStatus = useCallback(async () => {
    if (!user?.id) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(apiUrl(`/api/ingestion/status/${user.id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.status}`);
      }

      const data = await response.json();

      // Map backend response to connection state
      // Backend returns: { userId, connections: [{ service, connected, connectionId, syncStatus }] }
      const connections: ServiceConnection[] = (data.connections || []).map(
        (conn: {
          service: string;
          connected: boolean;
          syncStatus?: {
            lastSync?: string;
            status?: string;
            itemsSynced?: number;
            errorMessage?: string;
          };
        }) => ({
          service: conn.service as GoogleService,
          isConnected: conn.connected,
          lastSync: conn.syncStatus?.lastSync,
          itemsSynced: conn.syncStatus?.itemsSynced,
          status: conn.connected
            ? (conn.syncStatus?.status as ServiceConnection['status']) || 'active'
            : 'pending',
          error: conn.syncStatus?.errorMessage,
        })
      );

      // If backend didn't return all services, add missing ones as disconnected
      const serviceOrder: GoogleService[] = ['calendar', 'tasks', 'gmail', 'contacts'];
      const existingServices = new Set(connections.map(c => c.service));
      for (const service of serviceOrder) {
        if (!existingServices.has(service)) {
          connections.push({
            service,
            isConnected: false,
            status: 'pending',
          });
        }
      }

      // Sort connections by service order
      connections.sort(
        (a, b) => serviceOrder.indexOf(a.service) - serviceOrder.indexOf(b.service)
      );

      const connectedCount = connections.filter(c => c.isConnected).length;
      const overallStatus =
        connectedCount === 0
          ? 'disconnected'
          : connectedCount === 4
          ? 'connected'
          : 'partial';

      setState({
        isLoading: false,
        isConnecting: false,
        error: null,
        connections,
        overallStatus,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[useGoogleConnection] Status fetch error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [user?.id]);

  // Initiate OAuth connection
  const connect = useCallback(async () => {
    if (!user?.id) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      // Request OAuth URL from backend
      // We connect 'calendar' first as the primary service; Composio may grant broader access
      const response = await fetch(apiUrl('/api/ingestion/connect'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service: 'calendar', // Start with calendar, Composio handles scopes
          userId: user.id,
          redirectUrl: Linking.createURL('auth/google-callback'),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Connection failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.redirectUrl) {
        throw new Error('No redirect URL received');
      }

      // Open OAuth URL in browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.redirectUrl,
        Linking.createURL('auth/google-callback')
      );

      if (result.type === 'success') {
        // OAuth completed, refresh status
        await fetchStatus();
      } else if (result.type === 'cancel') {
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: 'Connection cancelled',
        }));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[useGoogleConnection] Connect error:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
    }
  }, [user?.id, fetchStatus]);

  // Disconnect Google services
  const disconnect = useCallback(async () => {
    if (!user?.id) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      // Disconnect all connected services
      const connectedServices = state.connections
        .filter(c => c.isConnected)
        .map(c => c.service);

      for (const service of connectedServices) {
        const response = await fetch(apiUrl('/api/ingestion/disconnect'), {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            service,
            userId: user.id,
          }),
        });

        if (!response.ok) {
          console.warn(`[useGoogleConnection] Failed to disconnect ${service}`);
        }
      }

      // Refresh status
      await fetchStatus();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[useGoogleConnection] Disconnect error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [user?.id, fetchStatus, state.connections]);

  // Trigger manual sync for a service
  const triggerSync = useCallback(
    async (service: GoogleService) => {
      if (!user?.id) return;

      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(apiUrl(`/api/ingestion/sync/${service}`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: user.id }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Sync failed: ${response.status}`);
        }

        // Refresh status after sync starts
        setTimeout(fetchStatus, 2000);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[useGoogleConnection] Sync error (${service}):`, error);
        throw new Error(errorMessage);
      }
    },
    [user?.id, fetchStatus]
  );

  // Fetch status on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      fetchStatus();
    }
  }, [user?.id, fetchStatus]);

  return {
    ...state,
    connect,
    disconnect,
    triggerSync,
    refresh: fetchStatus,
  };
}
