import { create } from 'zustand';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

axios.defaults.headers.common['bypass-tunnel-reminder'] = 'true';
axios.defaults.headers.common['ngrok-skip-browser-warning'] = '69420';

export const useStore = create((set, get) => ({
  // --- Auth State ---
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  role: typeof window !== 'undefined' ? localStorage.getItem('role') : null,
  user: null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('token') : false,
  authError: null,
  authLoading: false,

  // --- Dashboard Data State ---
  predictions: [],
  alerts: [],
  incidents: [],
  mlopsMetrics: null,
  dashboardStats: {
    totalCount: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    averageConfidence: 0,
    liveChartData: [], // Recharts series
  },
  
  // --- UI State ---
  activeTab: 'overview',
  wsConnected: false,
  wsInstance: null,

  // --- Auth Actions ---
  login: async (username, password) => {
    set({ authLoading: true, authError: null });
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const res = await axios.post(`${API_BASE}/auth/login`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token, role } = res.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', role);
      
      set({ 
        token: access_token, 
        role, 
        isAuthenticated: true, 
        authLoading: false 
      });
      
      // Load initial dashboard datasets
      get().fetchDashboardData();
      get().connectWebSocket();
      return true;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Authentication failed. Incorrect email or password.';
      set({ authError: msg, authLoading: false });
      return false;
    }
  },

  signup: async (name, email, password, role = 'USER') => {
    set({ authLoading: true, authError: null });
    try {
      await axios.post(`${API_BASE}/auth/signup`, { name, email, password, role });
      set({ authLoading: false });
      return true;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Sign up failed. Email might already be taken.';
      set({ authError: msg, authLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    const ws = get().wsInstance;
    if (ws) ws.close();
    set({ 
      token: null, 
      role: null, 
      user: null, 
      isAuthenticated: false,
      predictions: [],
      alerts: [],
      incidents: [],
      wsConnected: false,
      wsInstance: null
    });
  },

  // --- Fetch Historical Data ---
  fetchDashboardData: async () => {
    const token = get().token;
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [predsRes, alertsRes, incidentsRes] = await Promise.all([
        axios.get(`${API_BASE}/predictions?limit=50`, { headers }),
        axios.get(`${API_BASE}/alerts`, { headers }),
        axios.get(`${API_BASE}/incidents`, { headers })
      ]);

      const predictions = predsRes.data;
      const alerts = alertsRes.data;
      const incidents = incidentsRes.data;

      // Compile stats
      const totalCount = predictions.length;
      const highRiskCount = predictions.filter(p => p.label === 'HIGH').length;
      const mediumRiskCount = predictions.filter(p => p.label === 'MEDIUM').length;
      const lowRiskCount = predictions.filter(p => p.label === 'LOW').length;
      const averageConfidence = predictions.reduce((acc, p) => acc + p.confidence, 0) / (totalCount || 1);

      // Generate Recharts live data series based on past predictions
      const liveChartData = predictions.slice(0, 15).reverse().map((p, idx) => ({
        index: idx + 1,
        time: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        risk_score: parseFloat((p.risk_score * 100).toFixed(1)),
        amount: p.features?.Amount || 0,
      }));

      set({
        predictions,
        alerts,
        incidents,
        dashboardStats: {
          totalCount,
          highRiskCount,
          mediumRiskCount,
          lowRiskCount,
          averageConfidence,
          liveChartData
        }
      });
      
      // Fetch MLOps metrics if administrator
      if (get().role === 'ADMIN') {
        get().fetchMLOpsMetrics();
      }
    } catch (err) {
      console.error("Error fetching historical datasets:", err);
    }
  },

  fetchMLOpsMetrics: async () => {
    const token = get().token;
    if (!token || get().role !== 'ADMIN') return;
    try {
      const res = await axios.get(`${API_BASE}/retrain/metrics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ mlopsMetrics: res.data });
    } catch (err) {
      console.error("Error fetching MLOps metrics:", err);
    }
  },

  triggerRetraining: async () => {
    const token = get().token;
    if (!token || get().role !== 'ADMIN') return false;
    try {
      await axios.post(`${API_BASE}/retrain/trigger`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Poll metrics shortly after
      setTimeout(() => get().fetchMLOpsMetrics(), 5000);
      return true;
    } catch (err) {
      console.error("Error triggering retraining:", err);
      return false;
    }
  },

  createIncident: async (type, severity, description) => {
    const token = get().token;
    if (!token) return false;
    try {
      await axios.post(`${API_BASE}/incidents`, {
        type,
        severity,
        description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      get().fetchDashboardData();
      return true;
    } catch (err) {
      console.error("Error creating incident:", err);
      return false;
    }
  },

  // --- Real-time WebSocket Subscription ---
  connectWebSocket: () => {
    const token = get().token;
    if (!token || get().wsInstance) return;

    console.log("Establishing real-time WebSockets threat connection...");
    // Dynamically map WebSocket URL from HTTP API base (handling ws:// vs wss://)
    const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSockets connection established successfully!");
      set({ wsConnected: true, wsInstance: ws });
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      console.log("Real-time telemetry event received:", payload);

      if (payload.event_type === 'PREDICTION_CREATED') {
        const { prediction, alert, incident } = payload;
        
        // Formulate formatted row
        const newPred = {
          id: prediction.id,
          risk_score: prediction.risk_score,
          label: prediction.label,
          confidence: prediction.confidence,
          created_at: prediction.created_at,
          features: {
            Amount: prediction.amount,
            Time: prediction.time
          },
          explanation: {} // SHAP detail loaded lazily on expand
        };

        const updatedPredictions = [newPred, ...get().predictions].slice(0, 100);
        
        // Update alerts feed
        let updatedAlerts = get().alerts;
        if (alert) {
          updatedAlerts = [alert, ...updatedAlerts].slice(0, 50);
        }

        // Update incidents feed
        let updatedIncidents = get().incidents;
        if (incident) {
          updatedIncidents = [incident, ...updatedIncidents].slice(0, 50);
        }

        // Recompile stats
        const total = updatedPredictions.length;
        const high = updatedPredictions.filter(p => p.label === 'HIGH').length;
        const medium = updatedPredictions.filter(p => p.label === 'MEDIUM').length;
        const low = updatedPredictions.filter(p => p.label === 'LOW').length;
        const avgConf = updatedPredictions.reduce((acc, p) => acc + p.confidence, 0) / (total || 1);

        // Update active chart series
        const newChartPoint = {
          index: Date.now(),
          time: new Date(prediction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          risk_score: parseFloat((prediction.risk_score * 100).toFixed(1)),
          amount: prediction.amount,
        };
        const updatedChartData = [...get().dashboardStats.liveChartData, newChartPoint].slice(-15);

        set({
          predictions: updatedPredictions,
          alerts: updatedAlerts,
          incidents: updatedIncidents,
          dashboardStats: {
            totalCount: get().dashboardStats.totalCount + 1,
            highRiskCount: prediction.label === 'HIGH' ? get().dashboardStats.highRiskCount + 1 : get().dashboardStats.highRiskCount,
            mediumRiskCount: prediction.label === 'MEDIUM' ? get().dashboardStats.mediumRiskCount + 1 : get().dashboardStats.mediumRiskCount,
            lowRiskCount: prediction.label === 'LOW' ? get().dashboardStats.lowRiskCount + 1 : get().dashboardStats.lowRiskCount,
            averageConfidence: avgConf,
            liveChartData: updatedChartData
          }
        });
      }
    };

    ws.onclose = () => {
      console.log("WebSocket stream closed. Attempting reconnection in 5s...");
      set({ wsConnected: false, wsInstance: null });
      setTimeout(() => get().connectWebSocket(), 5000);
    };

    ws.onerror = (err) => {
      console.error("WebSocket encounter error:", err);
      ws.close();
    };
  }
}));
