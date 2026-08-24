'use strict';

const assert = require('assert');

// markdown_hook_boot.js installs the preprocess hook at module-eval time so
// the patched bundle can never render markdown before the hook exists. The
// config flag is read lazily per call because the generated config preamble
// runs in the bundle body, i.e. after this module evaluates.
(async () => {
  delete globalThis.__incipitConfig;
  delete globalThis.__CLAUDE_ENHANCE_PREPROCESS_MARKDOWN__;

  await import('../data/markdown_hook_boot.js');

  const hook = globalThis.__CLAUDE_ENHANCE_PREPROCESS_MARKDOWN__;
  assert.strictEqual(typeof hook, 'function', 'hook must be installed on load');

  // Config absent (pre-preamble call): math defaults to enabled.
  const withMath = hook('sum $a+b$ end');
  assert.ok(/CCREMATH/.test(withMath), 'math should tokenize when config is absent');
  assert.ok(!/\$a\+b\$/.test(withMath), 'raw inline math should not survive preprocessing');

  // Config with math disabled: raw `$...$` must pass through untouched.
  globalThis.__incipitConfig = Object.freeze({ features: { math: false } });
  const mathOff = hook('sum $a+b$ end');
  assert.strictEqual(mathOff, 'sum $a+b$ end', 'math disabled must leave markdown as-is');

  // Config with math enabled (preamble has run by first real call).
  globalThis.__incipitConfig = Object.freeze({ features: { math: true } });
  const mathOn = hook('sum $a+b$ end');
  assert.ok(/CCREMATH/.test(mathOn), 'math enabled should tokenize lazily per call');

  // Bare-URL preprocessing stays active on the same hook.
  const url = hook('see https://example.com/docs.');
  assert.ok(url.includes('<https://example.com/docs>'), 'bare URL autolink should apply');

  // Re-install must stay idempotent and functional.
  const { installMarkdownPreprocessHook } = await import('../data/markdown_hook_boot.js');
  installMarkdownPreprocessHook();
  assert.strictEqual(
    globalThis.__CLAUDE_ENHANCE_PREPROCESS_MARKDOWN__('x $y$ z'),
    hook('x $y$ z'),
    're-installed hook must behave identically',
  );

  console.log('markdown-hook-boot.test.js: all assertions passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
