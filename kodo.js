/**
 * Kodo Status Monitoring Integration
 * Provides heartbeat and incident reporting for TicketFlo
 */

const KODO_URL = process.env.KODO_URL || 'https://kodostatus.com';
const KODO_API_KEY = process.env.KODO_API_KEY;
const KODO_MONITOR_ID = process.env.KODO_MONITOR_ID || 'ticketflo-api';

/**
 * Send a heartbeat ping to Kodo
 * @param {Object} options - Optional heartbeat data
 * @param {string} options.status - 'up' or 'down'
 * @param {number} options.response_time_ms - Response time in ms
 * @param {string} options.message - Optional message
 */
export async function sendHeartbeat(options = {}) {
  if (!KODO_API_KEY) {
    console.warn('⚠️ Kodo API key not configured. Heartbeat skipped.');
    return;
  }

  try {
    const response = await fetch(`${KODO_URL}/api/heartbeat/${KODO_MONITOR_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': KODO_API_KEY,
      },
      body: JSON.stringify({
        status: options.status || 'up',
        response_time_ms: options.response_time_ms,
        message: options.message,
      }),
    });

    if (!response.ok) {
      console.error('❌ Kodo heartbeat failed:', response.status);
    }
  } catch (error) {
    // Silent fail - don't let monitoring affect the app
    console.error('❌ Kodo heartbeat error:', error.message);
  }
}

/**
 * Create an incident in Kodo
 * @param {Object} incident - Incident details
 * @param {string} incident.title - Incident title
 * @param {string} incident.severity - 'minor' | 'major' | 'critical'
 * @param {string} incident.status - 'investigating' | 'identified' | 'monitoring' | 'resolved'
 * @param {string} incident.message - Detailed message
 * @param {string[]} incident.services - Affected services
 */
export async function createIncident(incident) {
  if (!KODO_API_KEY) {
    console.warn('⚠️ Kodo API key not configured. Incident not reported.');
    return null;
  }

  try {
    const response = await fetch(`${KODO_URL}/api/v1/incidents`, {
      method: 'POST',
      headers: {
        'X-API-Key': KODO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: incident.title,
        severity: incident.severity || 'major',
        status: incident.status || 'investigating',
        message: incident.message,
        services: incident.services || ['API'],
      }),
    });

    if (!response.ok) {
      console.error('❌ Kodo incident creation failed:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('🚨 Kodo incident created:', incident.title);
    return data;
  } catch (error) {
    console.error('❌ Kodo incident error:', error.message);
    return null;
  }
}

/**
 * Update service status in Kodo
 * @param {string} serviceId - Service ID
 * @param {string} status - 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance'
 */
export async function updateServiceStatus(serviceId, status) {
  if (!KODO_API_KEY) {
    console.warn('⚠️ Kodo API key not configured. Service status not updated.');
    return null;
  }

  try {
    const response = await fetch(`${KODO_URL}/api/v1/services/${serviceId}`, {
      method: 'PATCH',
      headers: {
        'X-API-Key': KODO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      console.error('❌ Kodo service status update failed:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Kodo service status error:', error.message);
    return null;
  }
}

/**
 * Express middleware that sends heartbeats on each request
 * Use sparingly - consider using only for health checks or critical endpoints
 */
export function heartbeatMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    // Only send heartbeat for successful responses
    if (res.statusCode < 400) {
      sendHeartbeat({
        status: 'up',
        response_time_ms: Date.now() - start,
      }).catch(() => {}); // Silent fail
    }
  });

  next();
}

/**
 * Express error handler middleware that reports critical errors to Kodo
 */
export function kodoErrorHandler(err, req, res, next) {
  // Determine severity based on error type
  const severity = err.critical || err.statusCode >= 500 ? 'critical' : 'major';

  // Create incident for server errors
  if (err.statusCode >= 500 || err.critical) {
    createIncident({
      title: `Server Error: ${err.message?.substring(0, 50) || 'Unknown error'}`,
      severity,
      status: 'investigating',
      message: `Error occurred at ${req.method} ${req.path}\n\nStack: ${err.stack?.substring(0, 500) || 'No stack trace'}`,
      services: ['API'],
    }).catch(() => {}); // Silent fail
  }

  next(err);
}

/**
 * Report an error to Kodo (for use in try/catch blocks)
 * @param {Error} error - The error to report
 * @param {Object} context - Additional context
 */
export async function reportError(error, context = {}) {
  const severity = context.critical ? 'critical' : 'major';

  return createIncident({
    title: `${context.service || 'API'} Error: ${error.message?.substring(0, 50) || 'Unknown error'}`,
    severity,
    status: 'investigating',
    message: `${context.description || ''}\n\nError: ${error.message}\n\nStack: ${error.stack?.substring(0, 500) || 'No stack trace'}`,
    services: context.services || ['API'],
  });
}

export default {
  sendHeartbeat,
  createIncident,
  updateServiceStatus,
  heartbeatMiddleware,
  kodoErrorHandler,
  reportError,
};
