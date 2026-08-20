export function registerMonacoThemes(monaco: any) {
  if (!monaco || (monaco.editor as any).__clayThemesRegistered) return;
  (monaco.editor as any).__clayThemesRegistered = true;

  // 1. Warm Parchment Light Theme (blends seamlessly with warm clay UI)
  monaco.editor.defineTheme('clay-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '9C8D82', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C85A32', fontStyle: 'bold' },
      { token: 'string', foreground: '2A5A3D' },
      { token: 'number', foreground: 'E08A3C' },
      { token: 'type', foreground: '8B5A2B', fontStyle: 'bold' },
      { token: 'function', foreground: '8B5A2B' },
      { token: 'variable', foreground: '2D231E' },
      { token: 'delimiter', foreground: '5C4D44' },
      { token: 'operator', foreground: 'C85A32' },
    ],
    colors: {
      'editor.background': '#FAF4EE',
      'editor.foreground': '#2D231E',
      'editor.lineHighlightBackground': '#EFE6DC',
      'editorLineNumber.foreground': '#B8A89A',
      'editorLineNumber.activeForeground': '#C85A32',
      'editorCursor.foreground': '#C85A32',
      'editorWhitespace.foreground': '#E4D9CE',
      'editorIndentGuide.background': '#E4D9CE',
      'editorIndentGuide.activeBackground': '#C8B6A6',
      'editor.selectionBackground': '#E2CEBC',
      'editor.inactiveSelectionBackground': '#EDE2D7',
      'editorGutter.background': '#F5ECE3',
    }
  });

  // 2. Dark Warm Espresso Theme (Rich contrast dark code canvas)
  monaco.editor.defineTheme('clay-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7A6B60', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'E07A5F', fontStyle: 'bold' },
      { token: 'string', foreground: '81B29A' },
      { token: 'number', foreground: 'F4A261' },
      { token: 'type', foreground: 'E9C46A', fontStyle: 'bold' },
      { token: 'function', foreground: 'F4A261' },
      { token: 'variable', foreground: 'F5ECE3' },
      { token: 'delimiter', foreground: 'C8B6A6' },
      { token: 'operator', foreground: 'E07A5F' },
    ],
    colors: {
      'editor.background': '#1C130E',
      'editor.foreground': '#F5ECE3',
      'editor.lineHighlightBackground': '#281B15',
      'editorLineNumber.foreground': '#5A4A3E',
      'editorLineNumber.activeForeground': '#E07A5F',
      'editorCursor.foreground': '#E07A5F',
      'editorWhitespace.foreground': '#38281F',
      'editorIndentGuide.background': '#38281F',
      'editorIndentGuide.activeBackground': '#5A4A3E',
      'editor.selectionBackground': '#4A3326',
      'editor.inactiveSelectionBackground': '#38281F',
      'editorGutter.background': '#150E0A',
    }
  });
}
