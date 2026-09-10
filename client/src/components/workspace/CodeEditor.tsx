import { useMemo } from 'react';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import type { Extension } from '@codemirror/state';
import { monokai } from '@uiw/codemirror-theme-monokai';
import CodeMirror from '@uiw/react-codemirror';

function langFor(mode: string): Extension[] {
  switch (mode) {
    case 'application/json':
      return [json()];
    case 'text/html':
      return [html()];
    case 'application/xml':
      return [xml()];
    case 'text/javascript':
      return [javascript()];
    default:
      return [];
  }
}

export function CodeEditor({
  value,
  mode,
  onChange,
  readOnly = false,
}: {
  value: string;
  mode: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  const extensions = useMemo(() => langFor(mode), [mode]);

  return (
    <div className="editor-wrap">
      <CodeMirror
        value={value}
        theme={monokai}
        extensions={extensions}
        editable={!readOnly}
        readOnly={readOnly}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: !readOnly,
          highlightActiveLineGutter: !readOnly,
          bracketMatching: true,
          closeBrackets: !readOnly,
          foldGutter: false,
        }}
      />
    </div>
  );
}
