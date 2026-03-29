import { useState, useCallback } from "react";

const styles = {
  container: {
    maxWidth: 1300,
    margin: "40px auto",
    padding: 24,
    fontFamily: "system-ui, sans-serif",
  },
  h1: { marginBottom: 24 },
  form: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 },
  input: {
    padding: "8px 12px",
    border: "1px solid #ccc",
    borderRadius: 4,
    fontSize: 14,
  },
  button: {
    padding: "8px 16px",
    background: "#0969da",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
  },
  exportBtn: {
    padding: "8px 16px",
    background: "#1f883d",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
    marginLeft: 8,
  },
  error: { color: "#d1242f", marginBottom: 16 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "10px 8px",
    borderBottom: "2px solid #d0d7de",
    background: "#f6f8fa",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "8px",
    borderBottom: "1px solid #d0d7de",
    verticalAlign: "middle",
  },
  sha: {
    fontFamily: "monospace",
    background: "#f6f8fa",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 12,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  badge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 12,
  },
  badgeYes: { background: "#dafbe1", color: "#1a7f37" },
  badgeNo: { background: "#ffebe9", color: "#cf222e" },
  summary: {
    marginBottom: 16,
    padding: 12,
    background: "#f6f8fa",
    borderRadius: 8,
    border: "1px solid #d0d7de",
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  copyBtn: {
    padding: "2px 6px",
    background: "#f6f8fa",
    border: "1px solid #d0d7de",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 11,
    marginLeft: 4,
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
  },
  openIconBtn: {
    padding: "4px 6px",
    background: "none",
    border: "1px solid #d0d7de",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 16,
    textDecoration: "none",
    color: "#0969da",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  pageSpinner: {
    display: "inline-block",
    width: 32,
    height: 32,
    border: "4px solid #d0d7de",
    borderTopColor: "#0969da",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  rowSpinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    border: "2px solid #d0d7de",
    borderTopColor: "#0969da",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  checkIcon: { color: "#1a7f37", fontSize: 14 },
  selectedRow: { background: "#ddf4ff" },
  collapseBtn: {
    padding: "1px 6px",
    background: "#f6f8fa",
    border: "1px solid #d0d7de",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 11,
    marginRight: 4,
  },
  fileList: {
    margin: "4px 0 0 0",
    padding: "4px 0 0 0",
    listStyle: "none",
    fontSize: 12,
    fontFamily: "monospace",
  },
  // Modal
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    maxWidth: 800,
    width: "90%",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  modalClose: {
    padding: "4px 10px",
    background: "none",
    border: "1px solid #d0d7de",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
  },
  modalBody: {
    flex: 1,
    overflow: "auto",
    background: "#f6f8fa",
    borderRadius: 8,
    padding: 16,
    fontFamily: "monospace",
    fontSize: 12,
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    border: "1px solid #d0d7de",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
  modalCopyBtn: {
    padding: "8px 20px",
    background: "#0969da",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
};

const globalStyles = `
@keyframes spin { to { transform: rotate(360deg); } }
`;

function parseRepoUrl(url) {
  const match = url.trim().match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy(e) {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button style={styles.copyBtn} onClick={handleCopy} title={`Copy: ${text}`}>
      {copied ? <span style={styles.checkIcon}>&#10003;</span> : label}
    </button>
  );
}

function Spinner({ size = "row" }) {
  return <span style={size === "page" ? styles.pageSpinner : styles.rowSpinner} />;
}

function ShaCell({ sha }) {
  const [copied, setCopied] = useState(false);
  async function handleClick(e) {
    e.stopPropagation();
    await navigator.clipboard.writeText(sha);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <code style={styles.sha} onClick={handleClick} title={`Click to copy: ${sha}`}>
      {sha.substring(0, 12)}...
      {copied && <span style={styles.checkIcon}>&#10003;</span>}
    </code>
  );
}

function ChangedFilesCell({ files }) {
  const [expanded, setExpanded] = useState(false);

  if (!files || files.length === 0) return "-";

  return (
    <div>
      <button
        style={styles.collapseBtn}
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((prev) => !prev);
        }}
      >
        {expanded ? "\u25BC" : "\u25B6"} {files.length} files
      </button>
      {expanded && (
        <ul style={styles.fileList}>
          {files.map((f, i) => (
            <li key={i} style={{ padding: "1px 0" }}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExportModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);
  const jsonStr = JSON.stringify(data, null, 2);

  async function handleCopy() {
    await navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>Export Data ({data.length} issues)</span>
          <button style={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        <div style={styles.modalBody}>{jsonStr}</div>
        <div style={styles.modalFooter}>
          <button style={styles.modalCopyBtn} onClick={handleCopy}>
            {copied ? (
              <>
                <span style={styles.checkIcon}>&#10003;</span> Copied!
              </>
            ) : (
              "Copy JSON"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [url, setUrl] = useState("");
  const [repoInfo, setRepoInfo] = useState(null);
  const [issues, setIssues] = useState([]);
  const [details, setDetails] = useState({});
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const toggleSelect = useCallback((id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const allSelected = issues.length > 0 && issues.every((i) => prev[i.issueId]);
      const next = {};
      for (const i of issues) next[i.issueId] = !allSelected;
      return next;
    });
  }, [issues]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setRepoInfo(null);
    setIssues([]);
    setDetails({});
    setSelected({});
    setShowModal(false);

    const parsed = parseRepoUrl(url);
    if (!parsed) {
      setError("Invalid GitHub repo URL. Expected: https://github.com/owner/repo");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/issues/${parsed.owner}/${parsed.repo}/list`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Request failed");
        setLoading(false);
        return;
      }

      setRepoInfo({
        repo: data.repo,
        hasDockerfile: data.hasDockerfile,
        repoCategory: data.repoCategory,
        totalIssues: data.totalIssues,
      });
      setIssues(data.issues);
      setLoading(false);

      const initialDetails = {};
      for (const issue of data.issues) {
        initialDetails[issue.issueId] = { loading: true };
      }
      setDetails(initialDetails);

      for (const issue of data.issues) {
        fetch(`/api/issues/${parsed.owner}/${parsed.repo}/${issue.issueId}/details`)
          .then((r) => r.json())
          .then((d) => {
            setDetails((prev) => ({
              ...prev,
              [issue.issueId]: {
                baseSha: d.baseSha,
                fileChangedCount: d.fileChangedCount,
                changedFileNames: d.changedFileNames || [],
                prLink: d.prLink,
                loading: false,
              },
            }));
          })
          .catch(() => {
            setDetails((prev) => ({
              ...prev,
              [issue.issueId]: {
                baseSha: null,
                fileChangedCount: null,
                changedFileNames: [],
                prLink: null,
                loading: false,
                error: true,
              },
            }));
          });
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function getExportData() {
    const selectedIssues = issues.filter((i) => selected[i.issueId]);
    return selectedIssues.map((issue) => {
      const d = details[issue.issueId] || {};
      return {
        repoName: repoInfo.repo,
        issueLink: issue.issueLink,
        issueTitle: issue.issueTitle,
        baseSha: d.baseSha || null,
        repoCategory: repoInfo.repoCategory || null,
        prLink: d.prLink || null,
        changedFiles: (d.changedFileNames || []).join(", "),
      };
    });
  }

  const selectedCount = issues.filter((i) => selected[i.issueId]).length;
  const allSelected = issues.length > 0 && issues.every((i) => selected[i.issueId]);

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>
      <h1 style={styles.h1}>Issue Base SHA Finder</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          style={{ ...styles.input, flex: 1, minWidth: 350 }}
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button style={styles.button} disabled={loading}>
          {loading ? "Loading..." : "Fetch Issues"}
        </button>
      </form>

      {error && <p style={styles.error}>{error}</p>}

      {loading && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spinner size="page" />
          <p style={{ marginTop: 12 }}>Loading issue list...</p>
        </div>
      )}

      {repoInfo && (
        <div>
          <div style={styles.summary}>
            <span><strong>Repository:</strong> {repoInfo.repo}</span>
            <span><strong>Language:</strong> {repoInfo.repoCategory}</span>
            <span><strong>Issues:</strong> {repoInfo.totalIssues}</span>
            <span>
              <strong>Dockerfile:</strong>{" "}
              <span style={{ ...styles.badge, ...(repoInfo.hasDockerfile ? styles.badgeYes : styles.badgeNo) }}>
                {repoInfo.hasDockerfile ? "Yes" : "No"}
              </span>
            </span>
            <button
              style={{
                ...styles.exportBtn,
                opacity: selectedCount === 0 ? 0.5 : 1,
              }}
              disabled={selectedCount === 0}
              onClick={() => setShowModal(true)}
            >
              Export Selected ({selectedCount})
            </button>
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={styles.th}>Issue ID</th>
                <th style={styles.th}>Copy Link</th>
                <th style={styles.th}>Issue Title</th>
                <th style={styles.th}>Files Changed</th>
                <th style={styles.th}>Changed Files</th>
                <th style={styles.th}>Base SHA</th>
                <th style={styles.th}>Dockerfile</th>
                <th style={styles.th}>Open</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => {
                const d = details[issue.issueId] || { loading: true };
                const isSelected = !!selected[issue.issueId];
                return (
                  <tr
                    key={issue.issueId}
                    style={{
                      ...(isSelected ? styles.selectedRow : {}),
                      cursor: "pointer",
                    }}
                    onClick={() => toggleSelect(issue.issueId)}
                  >
                    <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(issue.issueId)}
                      />
                    </td>
                    <td style={styles.td}>#{issue.issueId}</td>
                    <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                      <CopyButton text={issue.issueLink} label="Copy" />
                    </td>
                    <td style={styles.td}>
                      {issue.issueTitle}
                      <span onClick={(e) => e.stopPropagation()}>
                        <CopyButton text={issue.issueTitle} label="Copy" />
                      </span>
                    </td>
                    <td style={styles.td}>
                      {d.loading ? <Spinner /> : d.fileChangedCount ?? "-"}
                    </td>
                    <td style={{ ...styles.td, maxWidth: 250 }}>
                      {d.loading ? (
                        <Spinner />
                      ) : (
                        <ChangedFilesCell files={d.changedFileNames} />
                      )}
                    </td>
                    <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                      {d.loading ? <Spinner /> : d.baseSha ? <ShaCell sha={d.baseSha} /> : "-"}
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...(repoInfo.hasDockerfile ? styles.badgeYes : styles.badgeNo) }}>
                        {repoInfo.hasDockerfile ? "Yes" : "No"}
                      </span>
                    </td>
                    <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                      <a
                        href={issue.issueLink}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.openIconBtn}
                        title="Open in new tab"
                      >
                        &#8599;
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ExportModal
          data={getExportData()}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
