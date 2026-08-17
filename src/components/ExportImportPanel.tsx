type ExportImportPanelProps = {
  importText: string;
  status: string;
  onImportTextChange: (value: string) => void;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
};

export function ExportImportPanel({
  importText,
  status,
  onImportTextChange,
  onExport,
  onImport,
  onClear
}: ExportImportPanelProps) {
  return (
    <section className="panel">
      <div className="section-heading">
        <p className="eyebrow">Data portability</p>
        <h2>Export / import JSON</h2>
      </div>
      <div className="action-row">
        <button className="primary-action" onClick={onExport} type="button">
          Export JSON
        </button>
        <button className="secondary-action" onClick={onImport} type="button">
          Import JSON
        </button>
        <button className="danger-action" onClick={onClear} type="button">
          Clear local data
        </button>
      </div>
      <label className="textarea-label">
        Paste exported JSON
        <textarea
          onChange={(event) => onImportTextChange(event.target.value)}
          placeholder="Paste a Launch Line export here, then choose Import JSON."
          value={importText}
        />
      </label>
      {status ? <p className="status-message">{status}</p> : null}
    </section>
  );
}
