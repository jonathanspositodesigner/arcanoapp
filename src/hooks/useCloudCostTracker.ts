// Global cloud cost tracker - tracks edge function invocations and bandwidth per route
// This runs in-browser and provides real-time visibility into costs

export interface RouteMetrics {
  invocations: number;
  bandwidth: number; // estimated bytes
  lastUpdated: number;
}

export interface CloudCostMetrics {
  byRoute: Record<string, RouteMetrics>;
  totalInvocations: number;
  totalBandwidth: number;
  sessionStart: number;
}

const STORAGE_KEY = 'cloudCostMetrics:v1';

// Global metrics object (singleton)
let metrics: CloudCostMetrics = {
  byRoute: {},
  totalInvocations: 0,
  totalBandwidth: 0,
  sessionStart: Date.now()
};

// Listeners for real-time updates
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach(fn => fn());
};

const canUseLocalStorage = (): boolean => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
};

// Load metrics from localStorage on init
const loadMetrics = (): CloudCostMetrics => {
  if (!canUseLocalStorage()) return metrics;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return metrics;
    
    const parsed = JSON.parse(raw) as CloudCostMetrics;
    
    // Reset if session is older than 24 hours
    if (Date.now() - parsed.sessionStart > 24 * 60 * 60 * 1000) {
      return metrics;
    }
    
    return parsed;
  } catch {
    return metrics;
  }
};

// Persist metrics to localStorage
let saveTimer: number | undefined;
const saveMetrics = () => {
  if (!canUseLocalStorage()) return;

  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
    } catch {
      // ignore
    }
  }, 500);
};

// Initialize
metrics = loadMetrics();

/**
 * Track an edge function invocation
 * @param functionName - Name of the edge function called
 * @param estimatedBytes - Estimated response size in bytes
 */
export const trackInvocation = (
  functionName: string, 
  estimatedBytes: number = 500 // default estimate for signed URL response
) => {
  const route = getCurrentRoute();
  
  if (!metrics.byRoute[route]) {
    metrics.byRoute[route] = {
      invocations: 0,
      bandwidth: 0,
      lastUpdated: Date.now()
    };
  }

  metrics.byRoute[route].invocations += 1;
  metrics.byRoute[route].bandwidth += estimatedBytes;
  metrics.byRoute[route].lastUpdated = Date.now();
  
  metrics.totalInvocations += 1;
  metrics.totalBandwidth += estimatedBytes;

  // Log in dev for debugging
  if (import.meta.env.DEV) {
    console.debug(`[CloudCost] ${functionName} invocation on ${route}`, {
      routeTotal: metrics.byRoute[route].invocations,
      sessionTotal: metrics.totalInvocations
    });
  }

  saveMetrics();
  notifyListeners();
};

/**
 * Track media bandwidth (for images/videos loaded)
 */
export const trackBandwidth = (bytes: number) => {
  const route = getCurrentRoute();
  
  if (!metrics.byRoute[route]) {
    metrics.byRoute[route] = {
      invocations: 0,
      bandwidth: 0,
      lastUpdated: Date.now()
    };
  }

  metrics.byRoute[route].bandwidth += bytes;
  metrics.totalBandwidth += bytes;
  
  saveMetrics();
  notifyListeners();
};

/**
 * Get current route path
 */
const getCurrentRoute = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  return window.location.pathname;
};

/**
 * Get current metrics snapshot
 */
export const getMetrics = (): CloudCostMetrics => {
  return { ...metrics };
};

/**
 * Reset all metrics
 */
export const resetMetrics = () => {
  metrics = {
    byRoute: {},
    totalInvocations: 0,
    totalBandwidth: 0,
    sessionStart: Date.now()
  };
  
  if (canUseLocalStorage()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  
  notifyListeners();
};

/**
 * Subscribe to metrics updates
 */
export const subscribeToMetrics = (callback: () => void): (() => void) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

/**
 * Calculate estimated costs from metrics
 */
export const calculateEstimatedCosts = (metricsData: CloudCostMetrics) => {
  // Supabase pricing
  const EDGE_FUNCTION_COST_PER_MILLION = 2.00; // $2 per million invocations
  const BANDWIDTH_COST_PER_GB = 0.09; // $0.09 per GB

  const invocationCost = (metricsData.totalInvocations / 1_000_000) * EDGE_FUNCTION_COST_PER_MILLION;
  const bandwidthGB = metricsData.totalBandwidth / (1024 * 1024 * 1024);
  const bandwidthCost = bandwidthGB * BANDWIDTH_COST_PER_GB;

  return {
    invocationCost,
    bandwidthCost,
    totalCost: invocationCost + bandwidthCost,
    projectedMonthlyCost: projectMonthlyCost(metricsData)
  };
};

/**
 * Project monthly cost based on current session usage
 */
const projectMonthlyCost = (metricsData: CloudCostMetrics): number => {
  const sessionDurationMs = Date.now() - metricsData.sessionStart;
  const sessionDurationHours = sessionDurationMs / (1000 * 60 * 60);
  
  if (sessionDurationHours < 0.1) return 0; // Not enough data
  
  const hoursInMonth = 24 * 30;
  const multiplier = hoursInMonth / sessionDurationHours;
  
  const costs = calculateEstimatedCosts(metricsData);
  return costs.totalCost * multiplier;
};
