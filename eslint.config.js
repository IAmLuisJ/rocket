import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'bin/**/*.ts', 'desktop/renderer/**/*.ts', 'desktop/renderer/**/*.tsx'],
    extends: [...tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'templates/'],
  },
)
