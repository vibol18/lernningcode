import { CPP_STANDARDS } from '../lib/browserCompiler.js';

/**
 * IDE settings drawer: editor + terminal preferences, all persisted.
 */

function Row({ label, children, hint }) {
  return (
    <div className="settings-row">
      <div className="settings-row-label">
        <span>{label}</span>
        {hint && <span className="settings-row-hint">{hint}</span>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select className="field-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export default function SettingsPanel({ settings, setSettings, onClose }) {
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }));

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-panel-head">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-section-title">Editor</div>
        <Row label="Theme">
          <Select
            value={settings.theme}
            onChange={(v) => set({ theme: v })}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
          />
        </Row>
        <Row label="Font size">
          <div className="seg-row">
            <button className="fs-btn" onClick={() => set({ fontSize: Math.max(12, settings.fontSize - 1) })}>−</button>
            <span className="fs-val">{settings.fontSize}px</span>
            <button className="fs-btn" onClick={() => set({ fontSize: Math.min(24, settings.fontSize + 1) })}>+</button>
          </div>
        </Row>
        <Row label="Tab size">
          <Select
            value={String(settings.tabSize)}
            onChange={(v) => set({ tabSize: parseInt(v, 10) })}
            options={[2, 4, 8].map((n) => ({ value: String(n), label: `${n} spaces` }))}
          />
        </Row>
        <Row label="Word wrap">
          <Select
            value={String(settings.wordWrap)}
            onChange={(v) => set({ wordWrap: v === 'true' })}
            options={[
              { value: 'false', label: 'Off' },
              { value: 'true', label: 'On' },
            ]}
          />
        </Row>
        <Row label="Autocomplete">
          <Select
            value={String(settings.autocomplete)}
            onChange={(v) => set({ autocomplete: v === 'true' })}
            options={[
              { value: 'true', label: 'On' },
              { value: 'false', label: 'Off' },
            ]}
          />
        </Row>
        <Row label="Line numbers">
          <Select
            value={String(settings.lineNumbers)}
            onChange={(v) => set({ lineNumbers: v === 'true' })}
            options={[
              { value: 'true', label: 'Show' },
              { value: 'false', label: 'Hide' },
            ]}
          />
        </Row>

        <div className="settings-section-title">Language / Standard</div>
        <Row label="Language">
          <Select
            value={settings.language}
            onChange={(v) => set({ language: v })}
            options={[
              { value: 'c', label: 'C' },
              { value: 'cpp', label: 'C++' },
            ]}
          />
        </Row>
        {settings.language === 'cpp' && (
          <Row label="C++ standard" hint="Only standards the in-browser compiler supports are listed">
            <Select
              value={settings.standard || 'c++17'}
              onChange={(v) => set({ standard: v })}
              options={CPP_STANDARDS.map((s) => ({ value: s, label: s.replace('c++', 'C++') }))}
            />
          </Row>
        )}

        <div className="settings-section-title">Terminal</div>
        <Row label="Font size">
          <div className="seg-row">
            <button className="fs-btn" onClick={() => set({ terminalFontSize: Math.max(11, settings.terminalFontSize - 1) })}>−</button>
            <span className="fs-val">{settings.terminalFontSize}px</span>
            <button className="fs-btn" onClick={() => set({ terminalFontSize: Math.min(20, settings.terminalFontSize + 1) })}>+</button>
          </div>
        </Row>
        <Row label="Font weight">
          <Select
            value={String(settings.terminalFontWeight)}
            onChange={(v) => set({ terminalFontWeight: parseInt(v, 10) })}
            options={[
              { value: '400', label: 'Regular' },
              { value: '600', label: 'Semibold' },
            ]}
          />
        </Row>
      </div>
    </div>
  );
}
