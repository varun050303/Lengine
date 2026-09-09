import { Specimen } from './specimen.js';

/**
 * Transfer Specimen: Webhook Integration Registration Endpoint
 * Specimen ID: specimen.api_webhook_02
 *
 * Provides a distinct application surface (API integrations & outbound webhooks)
 * sharing the underlying causal structure:
 * State mutation executed relying solely on ambient session credentials without
 * origin provenance validation or request-intent tokens.
 */
export class WebhookSubscriptionSpecimen extends Specimen {
  constructor() {
    super(
      'specimen.api_webhook_02',
      'Integrations Gateway - Event Webhook Registration API',
      'Target is an account integrations service allowing users to configure outbound HTTP callback webhooks for security and activity events.',
      {
        authorization_assumption: 'Authorized testing in sandbox integrations environment for account usr_4821.',
        scope_constraints: [
          'Confined to in-memory webhook registry for test account usr_4821.',
          'No actual outbound network pings dispatched.'
        ],
        stop_conditions: [
          'Stop immediately if unexpected error codes occur.'
        ],
        safer_alternative: 'Register benign callback URLs pointing to localhost or designated mock receivers.'
      }
    );

    this.initialState = {
      validSessionId: 'sess_user_9921',
      registeredWebhooks: []
    };

    this.state = JSON.parse(JSON.stringify(this.initialState));
  }

  getCurrentState() {
    return {
      webhooks_count: this.state.registeredWebhooks.length,
      webhooks: [...this.state.registeredWebhooks]
    };
  }

  reset() {
    this.state = JSON.parse(JSON.stringify(this.initialState));
    return this.getCurrentState();
  }

  getBaseline() {
    return {
      title: 'Baseline Normal Interaction (User subscribes webhook from integrations panel)',
      request: {
        method: 'POST',
        url: 'https://app.local/api/integrations/webhook',
        headers: {
          'Host': 'app.local',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Content-Type': 'application/json',
          'Origin': 'https://app.local',
          'Referer': 'https://app.local/settings/integrations',
          'Cookie': `session_id=${this.state.validSessionId}`
        },
        body: JSON.stringify({
          target_url: 'https://notifications.internal/hook',
          event_types: ['login', 'security_alert']
        }, null, 2)
      },
      response: {
        status: 201,
        statusText: 'Created',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': `session_id=${this.state.validSessionId}; Path=/; HttpOnly; SameSite=None; Secure`
        },
        body: JSON.stringify({
          status: 'created',
          webhook_id: 'whk_101',
          target_url: 'https://notifications.internal/hook',
          events: ['login', 'security_alert']
        }, null, 2)
      },
      state_after: {
        webhooks_count: 1
      }
    };
  }

  execute(mutation = {}) {
    const baseline = this.getBaseline();
    const prevCount = this.state.registeredWebhooks.length;

    const method = (mutation.method || baseline.request.method).toUpperCase();
    const url = mutation.url || baseline.request.url;
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    const headers = { ...baseline.request.headers };

    if (Array.isArray(mutation.removeHeaders)) {
      for (const h of mutation.removeHeaders) {
        delete headers[h];
        const key = Object.keys(headers).find(k => k.toLowerCase() === h.toLowerCase());
        if (key) delete headers[key];
      }
    }

    if (mutation.headers && typeof mutation.headers === 'object') {
      for (const [k, v] of Object.entries(mutation.headers)) {
        if (v === null || v === undefined) {
          delete headers[k];
          const match = Object.keys(headers).find(existing => existing.toLowerCase() === k.toLowerCase());
          if (match) delete headers[match];
        } else {
          headers[k] = String(v);
        }
      }
    }

    if ('cookie' in mutation) {
      if (mutation.cookie === null || mutation.cookie === false) {
        delete headers['Cookie'];
        delete headers['cookie'];
      } else {
        headers['Cookie'] = String(mutation.cookie);
      }
    }

    const body = mutation.body !== undefined ? mutation.body : baseline.request.body;

    let responseStatus = 201;
    let responseStatusText = 'Created';
    let responseHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'Connection': 'keep-alive'
    };
    let responseBody = {};

    if (path !== '/api/integrations/webhook') {
      responseStatus = 404;
      responseStatusText = 'Not Found';
      responseBody = { error: 'Endpoint not found', code: 'ERR_NOT_FOUND' };
    } else if (method !== 'POST') {
      responseStatus = 405;
      responseStatusText = 'Method Not Allowed';
      responseHeaders['Allow'] = 'POST';
      responseBody = { error: 'Method not allowed', code: 'ERR_METHOD_NOT_ALLOWED' };
    } else {
      const cookieHeader = headers['Cookie'] || headers['cookie'] || '';
      const hasValidSession = cookieHeader.includes(`session_id=${this.state.validSessionId}`);

      if (!hasValidSession) {
        responseStatus = 401;
        responseStatusText = 'Unauthorized';
        responseBody = { error: 'Authentication required', code: 'ERR_UNAUTHENTICATED' };
      } else {
        let parsed = null;
        try {
          parsed = typeof body === 'object' ? body : JSON.parse(body);
        } catch (e) {
          parsed = null;
        }

        if (!parsed || !parsed.target_url || typeof parsed.target_url !== 'string') {
          responseStatus = 400;
          responseStatusText = 'Bad Request';
          responseBody = { error: 'Invalid or missing target_url in request payload' };
        } else {
          const webhookId = `whk_${this.state.registeredWebhooks.length + 101}`;
          const newWebhook = {
            id: webhookId,
            target_url: parsed.target_url,
            events: Array.isArray(parsed.event_types) ? parsed.event_types : ['all'],
            created_at: new Date().toISOString()
          };

          this.state.registeredWebhooks.push(newWebhook);

          responseStatus = 201;
          responseStatusText = 'Created';
          responseHeaders['Set-Cookie'] = `session_id=${this.state.validSessionId}; Path=/; HttpOnly; SameSite=None; Secure`;
          responseBody = {
            status: 'created',
            webhook_id: newWebhook.id,
            target_url: newWebhook.target_url,
            events: newWebhook.events
          };
        }
      }
    }

    const stateChanged = this.state.registeredWebhooks.length !== prevCount;
    const rawHeadersStr = Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n');
    const rawResponseHeadersStr = Object.entries(responseHeaders).map(([k, v]) => `${k}: ${v}`).join('\n');
    const rawResponseBodyStr = JSON.stringify(responseBody, null, 2);

    const rawTranscript = [
      `>>> REQUEST:`,
      `${method} ${path} HTTP/1.1`,
      rawHeadersStr,
      '',
      typeof body === 'object' ? JSON.stringify(body) : (body || ''),
      '',
      `<<< RESPONSE:`,
      `HTTP/1.1 ${responseStatus} ${responseStatusText}`,
      rawResponseHeadersStr,
      '',
      rawResponseBodyStr,
      '',
      `[OBSERVABLE STATE]`,
      `Active Webhooks: ${this.state.registeredWebhooks.length} (State mutated: ${stateChanged})`
    ].join('\n');

    return {
      request: { method, url, path, headers, body },
      response: { status: responseStatus, statusText: responseStatusText, headers: responseHeaders, body: rawResponseBodyStr, json: responseBody },
      state_delta: {
        previous_count: prevCount,
        current_count: this.state.registeredWebhooks.length,
        state_mutated: stateChanged
      },
      raw_transcript: rawTranscript
    };
  }
}
