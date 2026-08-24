// Markdown preprocessing hook bootstrap.
//
// The hook must exist before the host's patched react-markdown handoff runs
// for the FIRST render. `enhance.js` loads through a dynamic import appended
// at the end of the webview bundle, so conversations restored after a VS Code
// restart could reach the handoff first and render raw `$...$` math that no
// later pass ever revisits. This module is injected as a static import at the
// TOP of the bundle: static imports evaluate before the importer's body, so
// the hook is installed before any host code can render markdown.
//
// It shares `markdown_preprocess.js` (and therefore the runtime math token)
// with the heavy modules, so placeholders created here are recognized by the
// regular DOM render pass once `enhance_typography.js` settles.

import { preprocessMarkdown } from './markdown_preprocess.js';

// The generated config preamble runs inside the bundle body, i.e. AFTER this
// module evaluates. Read the math flag lazily per call so the first call —
// which happens during host rendering, after the preamble has run — sees the
// user's configured value.
function mathEnabled() {
  const raw = globalThis.__incipitConfig;
  const features = raw && typeof raw.features === 'object' ? raw.features : {};
  return features.math !== false;
}

export function installMarkdownPreprocessHook() {
  globalThis.__CLAUDE_ENHANCE_PREPROCESS_MARKDOWN__ =
    raw => preprocessMarkdown(raw, { math: mathEnabled() });
}

installMarkdownPreprocessHook();
