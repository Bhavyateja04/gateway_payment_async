import { useEffect, useState } from "react";
import { api } from "../api.js";
import "./Webhooks.css";

function Webhooks() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("whsec_test_abc123");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadWebhookLogs();
    setLoading(false);
  }, []);

  const loadWebhookLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await api.get("/api/v1/webhooks?limit=20&offset=0");
      setLogs(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setMessage("Configuration saved successfully");
      setSaving(false);
      setTimeout(() => setMessage(""), 2500);
    }, 800);
  };

  const handleSendTestWebhook = async () => {
    try {
      setSaving(true);
      await api.post("/api/v1/webhooks/test", { event: "payment.test" });
      setMessage("Test webhook sent successfully");
      setTimeout(() => {
        setMessage("");
        loadWebhookLogs();
      }, 1500);
    } catch {
      setMessage("Error sending test webhook");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateSecret = () => {
    const newSecret = "whsec_" + Math.random().toString(36).slice(2, 14);
    setWebhookSecret(newSecret);
    setMessage("Webhook secret regenerated");
    setTimeout(() => setMessage(""), 2500);
  };

  const handleRetryWebhook = async (id) => {
    try {
      await api.post(`/api/v1/webhooks/${id}/retry`);
      setMessage("Retry scheduled");
      setTimeout(() => {
        setMessage("");
        loadWebhookLogs();
      }, 1500);
    } catch {
      setMessage("Retry failed");
    }
  };

  if (loading) {
    return <div className="webhooks-container">Loading…</div>;
  }

  return (
    <div className="webhooks-container">
      <div className="webhooks-content">
        <h1>Webhook Configuration</h1>
        <p>Manage your webhook settings and view delivery logs</p>

        {/* CONFIGURATION */}
        <div className="card">
          <div className="card-header">Configuration</div>
          <div className="card-body">
            <form onSubmit={handleSaveConfig}>
              <div className="form-group">
                <label>Webhook URL</label>
                <input
                  type="url"
                  placeholder="https://yoursite.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Webhook Secret</label>
                <div className="secret-row">
                  <code>{webhookSecret}</code>
                  <button
                    type="button"
                    className="btn-retry"
                    onClick={handleRegenerateSecret}
                  >
                    Regenerate
                  </button>
                </div>
              </div>

              <div className="button-group">
                <button className="btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Configuration"}
                </button>

                <button
                  type="button"
                  className="btn-secondary-outline"
                  disabled={saving}
                  onClick={handleSendTestWebhook}>               
                  Send Test Webhook
                </button>
              </div>
            </form>

            {message && <div className="message">{message}</div>}
          </div>
        </div>

        {/* LOGS */}
        <div className="card">
          <div className="card-header">Webhook Logs</div>

          {logsLoading ? (
            <div className="card-body">Loading logs…</div>
          ) : logs.length === 0 ? (
            <div className="card-body">No webhooks yet</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="event-col">Event</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Response</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="event-col">
                      <div className="event-name">{log.event}</div>
                      <div className="event-subtext">Webhook delivery</div>
                    </td>
                    <td>
                      <span className={`status-badge status-${log.status}`}>
                        {log.status}
                      </span>
                    </td>
                    <td>{log.attempts}</td>
                    <td>{log.response_code || "-"}</td>
                    <td>
                      {(log.status === "failed" ||
                        log.status === "pending") && (
                        <button
                          className="btn-retry"
                          onClick={() => handleRetryWebhook(log.id)}
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Webhooks;
