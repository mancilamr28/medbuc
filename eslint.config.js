import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * `eslint-plugin-react-hooks` is why this exists: `exhaustive-deps` would have
 * caught the note-overwrite bug (`usePersistentState` re-reading on a key it
 * didn't declare as a dependency) and any future stale closure in a `useEffect`
 * or `useCallback`. `tsc` cannot see hook dependency lists — only this can.
 *
 * The plugin's `recommended` config in v7 pulls in the full React Compiler
 * ruleset (`purity`, `refs`, `set-state-in-effect`, `immutability`, …), not
 * just the classic two. Those rules flag `usePersistentState`'s synchronous
 * re-read on key change — the deliberate, tested fix for the note bug — as an
 * anti-pattern, because storing a ref-read result in state during render is
 * exactly what it's designed to forbid. Adopting the full set would mean
 * rewriting tested code to prepare for a compiler this project doesn't use.
 * That's a separate initiative; this one only wires up what the plan asked
 * for, so only the two classic rules are enabled.
 */
export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // tsconfig's noUnusedLocals/noUnusedParameters already fail the build.
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**', 'supabase/harness.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**'],
    languageOptions: { globals: globals.node },
  },
);
