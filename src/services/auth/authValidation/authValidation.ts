import { z } from 'zod'

/** Schéma du signup (RM10, RM11, RM20, RM21).
 *
 *  L'email est normalisé AVANT d'être validé, via `.pipe()`. Valider d'abord
 *  refuserait ` MARC@x.com `, que RM21 exige d'accepter puis de rapprocher de
 *  `marc@x.com` ; normaliser sans valider laisserait passer `marc@`.
 *
 *  Les deux bornes du mot de passe doivent rester alignées sur Better Auth :
 *  `minPasswordLength: 8` dans sa config, et son maximum par défaut de 128.
 *  Refuser ici ce qu'il refuserait ensuite est ce qui fait sortir un mot de
 *  passe trop long en `VALIDATION_ERROR` plutôt qu'en `INTERNAL_ERROR`, faute
 *  d'un code `PASSWORD_TOO_LONG` dans le contrat. */
export const signupSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(128),
})

export type SignupInput = z.infer<typeof signupSchema>

/** Schéma du signin : même normalisation de l'email que le signup, pour qu'un
 *  ` MARC@x.com ` retrouve le compte `marc@x.com`. Le mot de passe n'a aucune
 *  borne ici : les rappeler au signin renseignerait sur la politique de mot de
 *  passe, et un mauvais mot de passe sort déjà en identifiants incorrects. */
export const signinSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string(),
})
