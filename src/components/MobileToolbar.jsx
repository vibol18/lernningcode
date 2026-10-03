import {
  insertTab,
  toggleComment,
  undo,
  redo,
  moveLineUp,
  moveLineDown,
} from '@codemirror/commands';
import { EditorSelection } from '@codemirror/state';

const SYMBOLS_ROW = ['(', ')', '{', '}', '[', ']', '"', "'", ';', ':', '=', '<', '>', '+', '-', '*', '/', '\\', '_', '#'];

/**
 * Phone-friendly editor toolbar. It sits above the virtual keyboard and offers
 * every action a phone keyboard cannot type (Tab, arrows, undo/redo, comment)
 * plus the symbols usually missing on phone keyboards. Buttons use
 * pointerdown+preventDefault so tapping them does NOT steal focus from the
 * CodeMirror editor — the editor keeps its selection/keyboard open.
 */
export default function MobileToolbar({ editorViewRef, isRunning, onRun, onStop, onClearConsole }) {
  const withView = (fn) => () => {
    const view = editorViewRef.current;
    if (view) {
      try { fn(view); } catch { /* ignore */ }
      try { view.focus(); } catch { /* ignore */ }
    }
  };

  const insert = (text) => () => {
    const view = editorViewRef.current;
    if (!view) return;
    view.dispatch(view.state.replaceSelection(text));
    try { view.focus(); } catch { /* ignore */ }
  };

  const moveChar = (delta) => () => {
    const view = editorViewRef.current;
    if (!view) return;
    const head = view.state.selection.main.head;
    const pos = Math.max(0, Math.min(view.state.doc.length, head + delta));
    view.dispatch({ selection: EditorSelection.cursor(pos) });
    try { view.focus(); } catch { /* ignore */ }
  };

  // Run/Stop/Tab buttons must never steal editor focus either: preventDefault
  // on pointerdown keeps the editor's selection and keyboard untouched.
  const keepFocus = (e) => { e.preventDefault(); };

  return (
    <div className="mobile-toolbar" aria-label="Editor toolbar">
      <div className="mt-row">
        <button className="mt-btn mt-run" onPointerDown={keepFocus} onClick={() => onRun()} disabled={isRunning}>▶ Run</button>
        <button className="mt-btn mt-stop" onPointerDown={keepFocus} onClick={() => onStop()} disabled={!isRunning}>■ Stop</button>
        <button className="mt-btn" onPointerDown={keepFocus} onClick={withView((v) => insertTab(v))}>Tab</button>
        <button className="mt-btn" onPointerDown={keepFocus} onClick={withView((v) => toggleComment(v))}>{'//'}</button>
        <button className="mt-btn" onPointerDown={keepFocus} onClick={withView((v) => undo(v))}>↶ Undo</button>
        <button className="mt-btn" onPointerDown={keepFocus} onClick={withView((v) => redo(v))}>↷ Redo</button>
        <button className="mt-btn" onPointerDown={keepFocus} onClick={withView((v) => moveLineUp(v))}>↑</button>
        <button className="mt-btn" onPointerDown={keepFocus} onClick={withView((v) => moveLineDown(v))}>↓</button>
        <button className="mt-btn" onPointerDown={keepFocus} onClick={moveChar(-1)}>←</button>
        <button className="mt-btn" onPointerDown={keepFocus} onClick={moveChar(1)}>→</button>
        <button className="mt-btn" onPointerDown={keepFocus} onClick={() => onClearConsole()}>⌫ Clear</button>
      </div>
      <div className="mt-row mt-symbols">
        {SYMBOLS_ROW.map((s, i) => (
          <button key={`${s}-${i}`} className="mt-btn mt-symbol" onPointerDown={keepFocus} onClick={insert(s)}>{s}</button>
        ))}
      </div>
    </div>
  );
}
