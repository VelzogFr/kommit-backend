import { describe, expect, it } from 'vitest'

import {
  signinSchema,
  signupSchema,
} from '@/services/auth/authValidation/authValidation.js'

// Le prénom passe par le champ `name` de Better Auth (contrainte technique du
// ticket : pas de `firstName` maison).
const validSignup = {
  name: 'Marc',
  email: 'marc@x.com',
  password: 'motdepasse8',
}

describe('2. Valeurs refusées', () => {
  describe('RM10 — email mal formé ou mot de passe court, refusé', () => {
    it.each(['marc', 'marc@', '@x.com', 'marc @x.com', ''])(
      'refuse l\'email mal formé "%s"',
      (malformedEmail) => {
        const signupWithMalformedEmail = { ...validSignup, email: malformedEmail }

        expect(signupSchema.safeParse(signupWithMalformedEmail).success).toBe(false)
      },
    )

    it('refuse un mot de passe de moins de 8 caractères', () => {
      const signupWithSevenCharPassword = { ...validSignup, password: '1234567' }

      expect(signupSchema.safeParse(signupWithSevenCharPassword).success).toBe(false)
    })

    it('accepte un mot de passe de 8 caractères', () => {
      const signupWithEightCharPassword = { ...validSignup, password: '12345678' }

      expect(signupSchema.safeParse(signupWithEightCharPassword).success).toBe(true)
    })

    // Le ticket écrit « sans maximum », en supposant que c'est le défaut de
    // Better Auth. C'est faux : il refuse au-delà de 128 caractères
    // (`dist/context/create-context.mjs:186`), avec un code `PASSWORD_TOO_LONG`
    // que le contrat d'API ne connaît pas. Sans borne ici, un mot de passe de
    // 129 caractères ressortait en « erreur interne ». Le ticket est à corriger
    // sur ce point.
    it('accepte un mot de passe de 128 caractères, la limite de Better Auth', () => {
      const signupWith128CharPassword = { ...validSignup, password: 'a'.repeat(128) }

      expect(signupSchema.safeParse(signupWith128CharPassword).success).toBe(true)
    })

    it('refuse un mot de passe de plus de 128 caractères', () => {
      const signupWith129CharPassword = { ...validSignup, password: 'a'.repeat(129) }

      expect(signupSchema.safeParse(signupWith129CharPassword).success).toBe(false)
    })
  })

  describe('RM11 — signup sans prénom, refusé', () => {
    it('refuse un signup sans champ prénom', () => {
      const signupWithoutName = {
        email: validSignup.email,
        password: validSignup.password,
      }

      expect(signupSchema.safeParse(signupWithoutName).success).toBe(false)
    })

    it('refuse un prénom vide', () => {
      const signupWithEmptyName = { ...validSignup, name: '' }

      expect(signupSchema.safeParse(signupWithEmptyName).success).toBe(false)
    })
  })

  describe('RM20 — prénom d\'espaces seulement, refusé', () => {
    it.each(['   ', '\t', ' \n '])(
      'refuse le prénom composé uniquement d\'espaces "%s"',
      (blankName) => {
        const signupWithBlankName = { ...validSignup, name: blankName }

        expect(signupSchema.safeParse(signupWithBlankName).success).toBe(false)
      },
    )

    it('retire les espaces autour du prénom avant de valider', () => {
      const signupWithSpacedName = { ...validSignup, name: '  Marc  ' }

      const normalizedSignup = signupSchema.parse(signupWithSpacedName)

      expect(normalizedSignup.name).toBe('Marc')
    })
  })
})

describe('3. Unicité de l\'email', () => {
  describe('RM21 — unicité insensible à la casse et aux espaces', () => {
    it('met l\'email en minuscules et retire les espaces autour', () => {
      const signupWithSpacedUppercaseEmail = { ...validSignup, email: '  MARC@x.com  ' }

      const normalizedSignup = signupSchema.parse(signupWithSpacedUppercaseEmail)

      expect(normalizedSignup.email).toBe('marc@x.com')
    })

    it('normalise un email entièrement en majuscules', () => {
      const signupWithUppercaseEmail = { ...validSignup, email: 'MARC@X.COM' }

      const normalizedSignup = signupSchema.parse(signupWithUppercaseEmail)

      expect(normalizedSignup.email).toBe('marc@x.com')
    })

    it('laisse intact un email déjà normalisé', () => {
      const normalizedSignup = signupSchema.parse(validSignup)

      expect(normalizedSignup.email).toBe('marc@x.com')
    })

    it('ne touche ni à la casse ni aux espaces du mot de passe', () => {
      const signupWithSpacedPassword = { ...validSignup, password: '  MotDePasse8  ' }

      const parsedSignup = signupSchema.parse(signupWithSpacedPassword)

      expect(parsedSignup.password).toBe('  MotDePasse8  ')
    })
  })
})

describe('4. Signin', () => {
  describe('RM13 — email du signin normalisé comme au signup', () => {
    it('met l\'email en minuscules et retire les espaces autour', () => {
      const signinWithSpacedUppercaseEmail = {
        email: '  MARC@x.com  ',
        password: 'motdepasse8',
      }

      const normalizedSignin = signinSchema.parse(signinWithSpacedUppercaseEmail)

      expect(normalizedSignin.email).toBe('marc@x.com')
    })

    it.each(['marcus', 'marc@', ''])('refuse l\'email mal formé "%s"', (malformedEmail) => {
      const signinWithMalformedEmail = { email: malformedEmail, password: 'motdepasse8' }

      expect(signinSchema.safeParse(signinWithMalformedEmail).success).toBe(false)
    })

    it('accepte un mot de passe de moins de 8 caractères, que Better Auth jugera', () => {
      const signinWithShortPassword = { email: 'marc@x.com', password: '1234567' }

      expect(signinSchema.safeParse(signinWithShortPassword).success).toBe(true)
    })
  })
})
