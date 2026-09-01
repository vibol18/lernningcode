import { useState } from 'react';

/**
 * Left file explorer. Lets students create/rename/delete project files,
 * switch the active editor tab, and download/upload. Projects persist to
 * localStorage (no backend). Each file carries its own language so a project
 * can mix .c, .cpp, and .h sources.
 */

function fileMeta(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'c') return { language: 'c', icon: '©' };
  if (ext === 'h' || ext === 'hpp') return { language: 'cpp', icon: '↟' };
  return { language: 'cpp', icon: '{ }' };
}

export default function FileExplorer({
  files,
  activeFile,
  onSelect,
  onRename,
  onCreate,
  onDelete,
  onDownload,
  onUpload,
}) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const sorted = [...files].sort((a, b) => {
    // main.* first, then .h/.hpp headers, then the rest alphabetically
    const rank = (f) => (f.name.startsWith('main.') ? 0 : f.name.endsWith('.h') || f.name.endsWith('.hpp') ? 1 : 2);
    return rank(a) - rank(b) || a.name.localeCompare(b.name);
  });

  const multiSourceNote = hasMultiSource(files);

  const startAdd = () => {
    setAdding(true);
    setNewName('');
  };

  const commitAdd = () => {
    const name = newName.trim();
    if (!name) return setAdding(false);
    onCreate(name);
    setAdding(false);
    setNewName('');
  };

  const commitRename = () => {
    if (renaming) {
      onRename(renaming, renameValue.trim());
    }
    setRenaming(null);
    setRenameValue('');
  };

  return (
    <div className="explorer">
      <div className="explorer-head">
        <span className="explorer-title">Explorer</span>
        <button className="icon-btn" title="New file" onClick={startAdd}>＋</button>
        <label className="icon-btn file-upload-btn" title="Upload file">
          ⬆
          <input
            type="file"
            accept=".c,.cpp,.cc,.cxx,.h,.hpp,.txt,.md"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {adding && (
        <div className="explorer-add">
          <input
            className="explorer-input"
            autoFocus
            value={newName}
            placeholder="filename.cpp"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitAdd();
              if (e.key === 'Escape') setAdding(false);
            }}
          />
          <button className="btn btn-ghost btn-small" onClick={commitAdd}>Add</button>
        </div>
      )}

      <ul className="explorer-list">
        {sorted.map((f) => (
          <li key={f.name}>
            {renaming === f.name ? (
              <div className="explorer-rename">
                <input
                  className="explorer-input"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                />
                <button className="btn btn-ghost btn-small" onClick={commitRename}>✓</button>
              </div>
            ) : (
              <div
                className={`explorer-file ${f.name === activeFile ? 'active' : ''}`}
                onClick={() => onSelect(f.name)}
              >
                <span className="explorer-ic">{fileMeta(f.name).icon}</span>
                <span className="explorer-name" title={f.name}>{f.name}</span>
                <span className="explorer-actions">
                  <button
                    className="icon-btn"
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenaming(f.name);
                      setRenameValue(f.name);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    className="icon-btn"
                    title="Download"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(f.name);
                    }}
                  >
                    ⇩
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(f.name);
                    }}
                  >
                    ✕
                  </button>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>

      {multiSourceNote && (
        <div className="explorer-note">
          Multiple source files exist. The in-browser compiler compiles the
          active file plus headers ({`#include`}) referenced from it — separate
          file-by-file linking is not supported.
        </div>
      )}
    </div>
  );
}

function hasMultiSource(files) {
  const src = files.filter((f) => f.name.endsWith('.cpp') || f.name.endsWith('.c'));
  return src.length > 1;
}
