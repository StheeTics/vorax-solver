import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/engine/**', 'src/data/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['react', 'react-dom', 'react/*', '@/ui/*', '**/ui/**'],
      }],
      'no-restricted-properties': ['error', {
        object: 'Math', property: 'random', message: 'Use the Rng interface.',
      }],
    },
  },
)
