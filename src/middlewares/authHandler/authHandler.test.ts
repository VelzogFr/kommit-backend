import { beforeEach, describe, expect, it, vi } from 'vitest'

// Même motif que `requireSession.test.ts` : `vi.mock` est hoisté au-dessus des
// imports, donc le mock passe par `vi.hoisted`.
const { handlerMock } = vi.hoisted(() => ({ handlerMock: vi.fn() }))

vi.mock('@/config/auth.js', () => ({
  auth: { handler: handlerMock },
}))

import { handleWithApiErrors } from '@/middlewares/authHandler/authHandler.js'

const SIGN_UP_URL = 'http://localhost:3000/api/auth/sign-up/email'
const SIGN_IN_URL = 'http://localhost:3000/api/auth/sign-in/email'

const postJson = (url: string, body: unknown) =>
  new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

const validSignup = {
  name: 'Marc',
  email: 'marc@x.com',
  password: 'motdepasse8',
}

beforeEach(() => {
  handlerMock.mockReset()
  handlerMock.mockResolvedValue(Response.json({ ok: true }, { status: 200 }))
})

describe('Le câblage du handler', () => {
  // Ce fichier existe pour ce test-là : le schéma Zod avait été écrit et
  // couvert par ses propres tests, mais aucun code ne l'appelait. Toute la
  // suite était verte, et seul un smoke manuel l'a vu.
  it("normalise l'email du signup avant de le transmettre à Better Auth", async () => {
    const signupWithMessyEmail = { ...validSignup, email: '  MARC@x.com  ' }

    await handleWithApiErrors(postJson(SIGN_UP_URL, signupWithMessyEmail))

    const transmittedRequest = handlerMock.mock.calls[0]?.[0] as Request
    const transmittedBody = (await transmittedRequest.json()) as {
      email: string
    }

    expect(transmittedBody.email).toBe('marc@x.com')
  })

  it('refuse une saisie invalide sans appeler Better Auth du tout', async () => {
    const signupWithShortPassword = { ...validSignup, password: '1234567' }

    const refusal = await handleWithApiErrors(
      postJson(SIGN_UP_URL, signupWithShortPassword),
    )

    expect(refusal.status).toBe(400)
    expect(await refusal.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(handlerMock).not.toHaveBeenCalled()
  })

  it("normalise l'email du signin avant de le transmettre à Better Auth", async () => {
    const signinWithMessyEmail = { email: '  MARC@x.com  ', password: 'motdepasse8' }

    await handleWithApiErrors(postJson(SIGN_IN_URL, signinWithMessyEmail))

    const transmittedRequest = handlerMock.mock.calls[0]?.[0] as Request
    const transmittedBody = (await transmittedRequest.json()) as {
      email: string
    }

    expect(transmittedBody.email).toBe('marc@x.com')
  })

  it('refuse un email mal formé au signin en INVALID_CREDENTIALS, sans appeler Better Auth', async () => {
    const signinWithMalformedEmail = { email: 'marcus', password: 'motdepasse8' }

    const refusal = await handleWithApiErrors(
      postJson(SIGN_IN_URL, signinWithMalformedEmail),
    )

    expect(refusal.status).toBe(401)
    expect(await refusal.json()).toMatchObject({ code: 'INVALID_CREDENTIALS' })
    expect(handlerMock).not.toHaveBeenCalled()
  })
})

describe('Les réponses de Better Auth', () => {
  it('laisse passer un succès intact, avec son cookie de session', async () => {
    handlerMock.mockResolvedValue(
      Response.json(
        { user: { id: 'user-1' } },
        {
          status: 200,
          headers: { 'set-cookie': 'better-auth.session_token=abc; HttpOnly' },
        },
      ),
    )

    const success = await handleWithApiErrors(postJson(SIGN_UP_URL, validSignup))

    expect(success.status).toBe(200)
    expect(success.headers.get('set-cookie')).toBe(
      'better-auth.session_token=abc; HttpOnly',
    )
  })

  it('ré-emballe une erreur reconnue en gardant son statut', async () => {
    handlerMock.mockResolvedValue(
      Response.json(
        {
          message: 'User already exists. Use another email.',
          code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
        },
        { status: 422 },
      ),
    )

    const rewrapped = await handleWithApiErrors(
      postJson(SIGN_UP_URL, validSignup),
    )

    expect(rewrapped.status).toBe(422)
    expect(await rewrapped.json()).toEqual({
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'Un compte avec cet email existe déjà',
    })
  })

  it('sort en 500 INTERNAL_ERROR quand Better Auth lève', async () => {
    handlerMock.mockRejectedValue(
      new Error('connect ECONNREFUSED 127.0.0.1:5432'),
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const failure = await handleWithApiErrors(postJson(SIGN_UP_URL, validSignup))

    expect(failure.status).toBe(500)
    expect(await failure.json()).toMatchObject({ code: 'INTERNAL_ERROR' })
  })

  it("journalise l'erreur d'origine quand il ne sait pas la traduire", async () => {
    handlerMock.mockResolvedValue(
      Response.json(
        { message: 'Failed to create session', code: 'FAILED_TO_CREATE_SESSION' },
        { status: 400 },
      ),
    )
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await handleWithApiErrors(postJson(SIGN_UP_URL, validSignup))

    expect(consoleError).toHaveBeenCalledWith(
      'Erreur Better Auth non reconnue',
      400,
      { message: 'Failed to create session', code: 'FAILED_TO_CREATE_SESSION' },
    )
  })
})
