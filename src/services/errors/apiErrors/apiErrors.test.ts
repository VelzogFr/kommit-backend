import { APIError } from 'better-auth/api'
import { describe, expect, it } from 'vitest'

import { Prisma } from '@/generated/prisma/client.js'
import { toApiError } from '@/services/errors/apiErrors/apiErrors.js'

// ── Les formes d'erreur ci-dessous ne sont pas devinées, elles sont relevées à la source ──
//
// Better Auth 1.7.2 :
//   `dist/api/routes/sign-up.mjs:212`
//     → APIError.from('UNPROCESSABLE_ENTITY', BASE_ERROR_CODES.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL)
//   `dist/api/routes/sign-in.mjs:324/331/338`
//     → APIError.from('UNAUTHORIZED', BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD)
//   `dist/api/routes/sign-in.mjs:317`
//     → APIError.from('BAD_REQUEST', BASE_ERROR_CODES.INVALID_EMAIL)
//   `dist/api/routes/sign-up.mjs:265`
//     → APIError.from('BAD_REQUEST', BASE_ERROR_CODES.FAILED_TO_CREATE_SESSION)
//   L'objet obtenu porte `status`, `statusCode` et `body = { message, code }`.
//   Le code d'email déjà pris est bien `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`,
//   PAS `USER_ALREADY_EXISTS`.
//   `BASE_ERROR_CODES` existe à l'exécution mais n'est pas dans les types publics
//   de `better-auth` : les codes sont donc écrits en clair ici, avec le message
//   anglais exact que la lib y associe.
//
// Prisma 7.9.1 :
//   violation de contrainte UNIQUE → `PrismaClientKnownRequestError` avec
//   `code: 'P2002'` et `meta: { modelName, target: ['email'] }`.

const buildUserAlreadyExistsError = () =>
  new APIError('UNPROCESSABLE_ENTITY', {
    message: 'User already exists. Use another email.',
    code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
  })

const buildInvalidEmailOrPasswordError = () =>
  new APIError('UNAUTHORIZED', {
    message: 'Invalid email or password',
    code: 'INVALID_EMAIL_OR_PASSWORD',
  })

const buildInvalidEmailError = () =>
  new APIError('BAD_REQUEST', {
    message: 'Invalid email',
    code: 'INVALID_EMAIL',
  })

const buildUniqueEmailViolation = () =>
  new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`email`)',
    {
      code: 'P2002',
      clientVersion: '7.9.1',
      meta: { modelName: 'user', target: ['email'] },
    },
  )

describe('3. Unicité de l\'email', () => {
  describe('RM9 — email déjà utilisé, EMAIL_ALREADY_EXISTS', () => {
    it('convertit l\'erreur d\'email déjà pris de Better Auth en EMAIL_ALREADY_EXISTS', () => {
      const userAlreadyExistsError = buildUserAlreadyExistsError()

      expect(toApiError(userAlreadyExistsError)).toEqual({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Un compte avec cet email existe déjà',
      })
    })

    it('convertit la violation de contrainte UNIQUE de Prisma en EMAIL_ALREADY_EXISTS', () => {
      const uniqueEmailViolation = buildUniqueEmailViolation()

      expect(toApiError(uniqueEmailViolation)).toEqual({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Un compte avec cet email existe déjà',
      })
    })

    it('ne fait jamais ressortir un email déjà pris en INTERNAL_ERROR', () => {
      const emailAlreadyTakenErrors = [
        buildUserAlreadyExistsError(),
        buildUniqueEmailViolation(),
      ]

      const convertedCodes = emailAlreadyTakenErrors.map(
        (error) => toApiError(error).code,
      )

      expect(convertedCodes).toEqual(['EMAIL_ALREADY_EXISTS', 'EMAIL_ALREADY_EXISTS'])
    })
  })
})

describe('4. Gestion des erreurs et pannes', () => {
  describe('RM13 — identifiants incorrects, INVALID_CREDENTIALS', () => {
    it('convertit l\'erreur d\'identifiants de Better Auth en INVALID_CREDENTIALS', () => {
      const invalidEmailOrPasswordError = buildInvalidEmailOrPasswordError()

      expect(toApiError(invalidEmailOrPasswordError).code).toBe('INVALID_CREDENTIALS')
    })

    it('ne renvoie pas le message anglais brut de Better Auth', () => {
      const invalidEmailOrPasswordError = buildInvalidEmailOrPasswordError()

      const convertedInvalidCredentials = toApiError(invalidEmailOrPasswordError)

      expect(convertedInvalidCredentials.code).toBe('INVALID_CREDENTIALS')
      expect(convertedInvalidCredentials.message).not.toBe('Invalid email or password')
    })

    it('convertit l\'email mal formé du signin en INVALID_CREDENTIALS, pas en INTERNAL_ERROR', () => {
      const invalidEmailError = buildInvalidEmailError()

      expect(toApiError(invalidEmailError)).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect',
      })
    })
  })

  describe('RM18, RM19 — panne, INTERNAL_ERROR distinct du métier', () => {
    it.each([
      ['une erreur JavaScript quelconque', new Error('connect ECONNREFUSED 127.0.0.1:5432')],
      ['une chaîne jetée telle quelle', 'boom'],
      ['undefined', undefined],
      ['null', null],
      ['un objet qui n\'est pas une Error', { oops: true }],
      [
        'une APIError de Better Auth non reconnue',
        new APIError('BAD_REQUEST', {
          message: 'Failed to create session',
          code: 'FAILED_TO_CREATE_SESSION',
        }),
      ],
      [
        'une erreur Prisma qui n\'est pas une violation UNIQUE',
        new Prisma.PrismaClientKnownRequestError('Record to update not found.', {
          code: 'P2025',
          clientVersion: '7.9.1',
        }),
      ],
    ])('convertit %s en INTERNAL_ERROR', (_cas, unrecognizedError) => {
      expect(toApiError(unrecognizedError).code).toBe('INTERNAL_ERROR')
    })

    it('ne laisse jamais fuiter le message brut de la panne', () => {
      const databaseOutage = new Error(
        'Can\'t reach database server at `localhost:5432`',
      )

      const convertedOutage = toApiError(databaseOutage)

      expect(convertedOutage.code).toBe('INTERNAL_ERROR')
      expect(convertedOutage.message).not.toContain('localhost:5432')
    })

    it('renvoie un code distinct de celui des erreurs métier', () => {
      const databaseOutage = new Error('connect ECONNREFUSED 127.0.0.1:5432')

      const convertedCodes = {
        panne: toApiError(databaseOutage).code,
        emailPris: toApiError(buildUserAlreadyExistsError()).code,
        identifiants: toApiError(buildInvalidEmailOrPasswordError()).code,
      }

      expect(convertedCodes).toEqual({
        panne: 'INTERNAL_ERROR',
        emailPris: 'EMAIL_ALREADY_EXISTS',
        identifiants: 'INVALID_CREDENTIALS',
      })
    })
  })
})
