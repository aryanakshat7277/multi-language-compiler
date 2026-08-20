/**
 * WebSocket Status Server — In-process event-based (no Redis dependency).
 * 
 * Uses a simple EventEmitter for job status broadcasts.
 * In production, swap to Redis Pub/Sub.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

interface WsMessage {
  type: string;
  jobId?: string;
}

// Global event bus for job status updates
export const statusBus = new EventEmitter();
statusBus.setMaxListeners(100);

export const setupWebSocket = (server: Server) => {
  const wss = new WebSocketServer({ server });
  
  // Map jobId -> Set of WebSockets
  const subscriptions = new Map<string, Set<WebSocket>>();
  
  // Listen for in-process job status events
  statusBus.on('job_update', ({ jobId, status, data }: { jobId: string; status: string; data?: any }) => {
    const clients = subscriptions.get(jobId);
    if (clients) {
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'status', jobId, status, data }));
        }
      });
    }
  });

  wss.on('connection', (ws) => {
    ws.on('message', (message: string) => {
      try {
        const parsed = JSON.parse(message.toString()) as WsMessage;
        
        if (parsed.type === 'subscribe' && parsed.jobId) {
          let clients = subscriptions.get(parsed.jobId);
          if (!clients) {
            clients = new Set();
            subscriptions.set(parsed.jobId, clients);
          }
          clients.add(ws);
        }
        
        if (parsed.type === 'unsubscribe' && parsed.jobId) {
          const clients = subscriptions.get(parsed.jobId);
          if (clients) clients.delete(ws);
        }
      } catch (e) {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      for (const clients of subscriptions.values()) {
        clients.delete(ws);
      }
    });
  });

  logger.info('WebSocket status server initialized');
  return wss;
};

/**
 * Helper to broadcast a job status update.
 * Call this from execution handlers.
 */
export function broadcastJobStatus(jobId: string, status: string, data?: any) {
  statusBus.emit('job_update', { jobId, status, data });
}
