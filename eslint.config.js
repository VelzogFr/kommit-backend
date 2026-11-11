import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/', 'src/generated/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // Un préfixe _ marque un paramètre volontairement inutilisé
      // (ex. le _next du errorHandler, les stubs des services à venir).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Imports internes via l'alias @/ (jamais ./ ni ../). Le regex attrape tout chemin
      // relatif, imbriqué ou non ; @/ et les paquets externes passent.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\.?/',
              message: "Imports internes : utilise l'alias @/, jamais un chemin relatif (./ ou ../).",
            },
          ],
        },
      ],
    },
  },
)
