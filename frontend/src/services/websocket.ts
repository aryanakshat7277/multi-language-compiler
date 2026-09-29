class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private subscribers: Map<string, (data: any) => void> = new Map();
  private adminCallbacks: Set<(event: string, payload: any) => void> = new Set();

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // Assuming backend is at 3001 in dev
    this.url = import.meta.env.DEV ? `ws://localhost:3001/ws` : `${protocol}//${host}/ws`;
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;
    
    this.socket = new WebSocket(this.url);
    
    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      if (this.adminCallbacks.size > 0) {
        this.socket?.send(JSON.stringify({ type: 'subscribe_admin' }));
      }
    };
    
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.jobId && this.subscribers.has(data.jobId)) {
          this.subscribers.get(data.jobId)!(data);
        }
        if (data.type === 'admin_event') {
          this.adminCallbacks.forEach(cb => {
            try {
              cb(data.event, data.payload);
            } catch (err) {
              console.error('Error in admin WS callback:', err);
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };
    
    this.socket.onclose = () => {
      setTimeout(() => {
        this.reconnectAttempts++;
        if (this.reconnectAttempts < 5) this.connect();
      }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000));
    };
  }

  subscribeToAdmin(onAdminUpdate: (event: string, payload: any) => void) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect();
    }
    this.adminCallbacks.add(onAdminUpdate);
    const sendSub = () => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'subscribe_admin' }));
      }
    };
    if (this.socket?.readyState === WebSocket.OPEN) {
      sendSub();
    } else {
      const checkInterval = setInterval(() => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          sendSub();
          clearInterval(checkInterval);
        }
      }, 100);
    }
  }

  unsubscribeFromAdmin(onAdminUpdate: (event: string, payload: any) => void) {
    this.adminCallbacks.delete(onAdminUpdate);
    if (this.adminCallbacks.size === 0 && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'unsubscribe_admin' }));
    }
  }

  subscribeToJob(jobId: string, onStatusUpdate: (data: any) => void) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect();
    }
    this.subscribers.set(jobId, onStatusUpdate);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'subscribe', jobId }));
    } else {
      // Send once connected
      const checkInterval = setInterval(() => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: 'subscribe', jobId }));
          clearInterval(checkInterval);
        }
      }, 100);
    }
  }

  unsubscribe(jobId: string) {
    this.subscribers.delete(jobId);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'unsubscribe', jobId }));
    }
  }
}

export const wsService = new WebSocketService();
