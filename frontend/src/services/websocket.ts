class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private subscribers: Map<string, (data: any) => void> = new Map();

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
    };
    
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.jobId && this.subscribers.has(data.jobId)) {
          this.subscribers.get(data.jobId)!(data);
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
