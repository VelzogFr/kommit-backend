// ─────────────────────────────────────────────────────
// ERREURS
// ─────────────────────────────────────────────────────
// Le back NE laisse PAS passer les erreurs brutes de Better Auth ni celles du
// provider LLM. Il les ré-emballe en `ApiError`. Le front ne connaît que cette
// forme-là — il ne dépend jamais du format d'erreur d'une lib externe.

/** Erreurs d'authentification (F1), une par message distinct du ticket. */
export type AuthErrorCode =
  /** Signup, email déjà utilisé → « Un compte avec cet email existe déjà » (RM9).
   *  Insensible à la casse et aux espaces : ` MARC@x.com ` == `marc@x.com` (RM21). */
  | "EMAIL_ALREADY_EXISTS"
  /** Signin, email OU mot de passe faux → message générique, sans dire lequel (RM13).
   *  L'inscription révèle qu'un email est pris, la connexion ne révèle jamais rien :
   *  postures volontairement opposées, tranché le 2026-07-12. */
  | "INVALID_CREDENTIALS"

/** Erreurs du standup (F2). */
export type StandupErrorCode =
  /** Aucun standup pour la date demandée (GET /standups/:date) — RM45. */
  | "STANDUP_NOT_FOUND"
  /** Quota du provider LLM dépassé (429 Groq). ⚠️ Le quota est **par clé d'API**.
   *  Le front en fait un message distinct d'une erreur métier (RM32). */
  | "LLM_QUOTA_EXCEEDED"
  /** Le provider LLM est indisponible (500, 503, timeout) — RM31. */
  | "LLM_UNAVAILABLE"
  /** La sortie du LLM ne respecte pas la forme attendue d'un `StandupSummary`
   *  (JSON invalide, catégorie manquante). Aucun standup malformé n'est enregistré (RM29). */
  | "SUMMARY_MALFORMED"

/** Saisie refusée par la validation serveur (Zod) — des deux côtés.
 *  F1 : email mal formé, mot de passe < 8, prénom absent ou vide après trim
 *       (RM10, RM11, RM20).
 *  F2 : message vide, résumé non conforme à la forme attendue (RM39). */
export type ValidationErrorCode = "VALIDATION_ERROR"

/** Panne serveur (5xx). Le front en fait un message DISTINCT des erreurs métier,
 *  et laisse l'action re-tentable (RM18, RM19 de F1). */
export type InternalErrorCode = "INTERNAL_ERROR"

/** Réponse d'erreur normalisée. Toute erreur du back a cette forme.
 *  `message` est le texte métier, déjà prêt à afficher. */
export type ApiError = {
  code: AuthErrorCode | StandupErrorCode | ValidationErrorCode | InternalErrorCode
  message: string
}

// DÉCISION : `ApiError` ne porte pas le champ en faute. Le front route par le CODE :
// `EMAIL_ALREADY_EXISTS` s'affiche sous l'email, tout le reste en message global du
// formulaire. Un porteur de champ obligerait le back à connaître les formulaires du front.

// ─────────────────────────────────────────────────────
// F1 — AUTH
// ─────────────────────────────────────────────────────
// PAS D'ENDPOINTS MAISON : signup / signin / signout / session sont fournis par
// Better Auth (adapter Express + Prisma). Le back ne réécrit pas ces routes — il les
// configure, et ré-emballe leurs erreurs en `ApiError`.
// Le contrat ne fige donc QUE la forme que le front LIT.

/** L'utilisateur de la session courante.
 *  `name` = le « Prénom ». C'est le champ NATIF de Better Auth, pas un `firstName`
 *  custom. Affiché tel quel dans le titre de l'accueil (RM2) et dans le toast
 *  (RM3, RM4) — le front le rend comme texte brut (RM23). */
export type SessionUser = {
  id: string
  name: string
  email: string
}

/** Ce que le front lit pour savoir s'il y a quelqu'un de connecté.
 *  `null` → état non connecté de l'accueil (RM1). */
export type Session = {
  user: SessionUser
} | null

// Hors contrat, noté ici pour qu'on ne le cherche pas : le toast d'arrivée
// (« Bienvenue {prénom} » vs « Content de te revoir, {prénom} », RM3/RM4) se décide
// ENTIÈREMENT côté front — il sait quel bouton a été cliqué et transporte l'info
// jusqu'à l'accueil. `SessionUser` ne porte AUCUN champ « nouvel utilisateur ».

// ─────────────────────────────────────────────────────
// F2 — LE STANDUP
// ─────────────────────────────────────────────────────

/** Un jour, au format `YYYY-MM-DD`.
 *
 *  ⚠️ LE SERVEUR FAIT AUTORITÉ SUR LE JOUR, en fuseau **Europe/Paris fixe**.
 *  Aucune requête ne porte le jour courant : le serveur l'impose (voir `PostStandupBody`).
 *  Le front calcule son calendrier dans le MÊME fuseau — sinon un standup validé à
 *  00h30 se poserait sur le carré de la veille et l'alerte « tu l'as déjà fait »
 *  ne se déclencherait plus. Décision du 2026-07-12.
 *
 *  Le bonus US3 (renseigner un jour passé) devra ROUVRIR ce point : en l'état,
 *  l'API n'autorise pas à dater un standup ailleurs qu'aujourd'hui. */
export type Jour = string

/** Le résumé structuré d'un standup — c'est LUI qu'on persiste, pas le transcript.
 *
 *  Trois LISTES d'items, pas trois textes : F3 devra relire le « prévu » de la veille
 *  item par item pour suivre les engagements. Une catégorie vide est une liste VIDE
 *  (`[]`) — c'est le FRONT qui affiche « Aucun ». « Aucun » en item littéral serait
 *  une fausse donnée, que F3 prendrait pour un blocage nommé « Aucun ». */
export type StandupSummary = {
  fait: string[]
  blocages: string[]
  prevu: string[]
}

/** Un standup enregistré, en lecture seule côté UI (RM10). */
export type Standup = {
  id: string
  jour: Jour
  summary: StandupSummary
}

// ── Lecture ──────────────────────────────────────────────

/** GET /standups?from=YYYY-MM-DD&to=YYYY-MM-DD
 *  Alimente le calendrier (fenêtre glissante de 53 semaines, RM11).
 *  Scopé par la session : un utilisateur ne reçoit QUE ses propres standups (RM38). */
export type GetCalendrierQuery = { from: Jour; to: Jour }

/** Les jours renseignés de la fenêtre — les carrés verts (RM12).
 *  Les résumés ne sont PAS inclus : ils sont chargés à l'ouverture d'un carré
 *  (GET /standups/:jour), ce qui évite de transporter ~365 résumés à chaque montage
 *  de l'accueil. Conséquence assumée : la modale résumé a un état de chargement (RM46).
 *  `count` porte sur LA FENÊTRE DEMANDÉE, pas sur tout l'historique : le chiffre affiché
 *  correspond aux carrés verts visibles. Il est renvoyé par le back pour que le front
 *  n'ait pas à recalculer un chiffre qu'il pourrait faire diverger en silence. */
export type GetCalendrierResponse = {
  count: number
  jours: Jour[]
}

/** GET /standups/:jour
 *  Le résumé d'un jour, en lecture seule (RM14). Scopé par la session (RM38).
 *  → `STANDUP_NOT_FOUND` si le jour n'a pas de standup, ou s'il appartient à
 *    quelqu'un d'autre : jamais le contenu d'autrui (RM38, RM45). */
export type GetStandupResponse = Standup

/** GET /standups/today
 *  Décide l'affichage de l'accueil : « à faire » (RM1) vs « déjà fait » (RM8).
 *  Le serveur calcule « aujourd'hui » lui-même (cf. `Jour`). */
export type GetTodayResponse = {
  done: boolean
  standup: Standup | null
}

// ── Conversation (streaming SSE) ────────────────────────────────
// Le serveur est SANS ÉTAT : il ne garde rien entre deux tours. Le front renvoie
// donc TOUT l'historique à chaque appel. Décision du 2026-07-12.

/** Un message du fil de conversation. */
export type Message = {
  role: "user" | "assistant"
  content: string
}

/** POST /standups/conversation
 *  Envoie le fil complet, reçoit la réponse de l'IA en streaming.
 *  Le premier message (`role: 'user'`) est ce qui a été tapé dans la zone de saisie
 *  de l'accueil (RM2). Un message vide ou blanc est refusé (RM39, `VALIDATION_ERROR`).
 *
 *  ⚠️ La RÉPONSE N'EST PAS DU JSON : c'est un flux SSE d'événements `SseEvent`. */
export type PostConversationBody = { messages: Message[] }

/** Les événements poussés sur le flux SSE.
 *
 *  Le résumé n'est PAS écrit en texte dans le fil : il arrive UNE SEULE FOIS, en
 *  données, dans l'événement `summary`, et c'est le FRONT qui dessine les puces à
 *  partir de ce JSON. Si l'IA écrivait les items en texte ET produisait le JSON, les
 *  deux pourraient diverger — l'utilisateur validerait ce qu'il a lu et on
 *  enregistrerait autre chose. Conséquence assumée : les items du résumé
 *  n'apparaissent pas au fil de l'eau, ils arrivent d'un bloc.
 *
 *  L'événement `summary` est aussi le SIGNAL qui active « Valider mon standup » :
 *  tant qu'il n'est pas tombé, il n'y a rien à enregistrer (RM25).
 *
 *  Une erreur survenant PENDANT le flux ne peut plus être un code HTTP (les en-têtes
 *  `200 / text/event-stream` sont déjà partis) — d'où l'événement `error`. */
export type SseEvent =
  /** Fragment de la réponse de l'IA, au fil de l'eau (RM4). */
  | { type: "token"; text: string }
  /** Le résumé structuré, produit en fin de conversation (RM5). */
  | { type: "summary"; summary: StandupSummary }
  /** Le flux s'interrompt : quota LLM, provider indisponible, résumé non conforme (RM31, RM32). */
  | { type: "error"; error: ApiError }

// ── Validation du standup ────────────────────────────────────

/** POST /standups
 *  Enregistre le standup du jour (RM6).
 *
 *  LE CORPS NE PORTE PAS DE DATE : le serveur impose le jour (cf. `Jour`). Le client
 *  ne peut donc pas dater un standup dans le passé ou le futur.
 *
 *  C'est le FRONT qui renvoie le résumé : il garde le JSON reçu dans l'événement
 *  `summary` et le poste tel quel. Le serveur en valide la FORME (Zod), pas la
 *  provenance. Conséquence assumée : un utilisateur peut poster un résumé différent
 *  de celui produit par l'IA — c'est-à-dire tricher sur SON PROPRE standup. Aucun
 *  privilège gagné, aucune donnée d'autrui touchée. « Le résumé est en lecture seule »
 *  (RM10) est donc une règle d'interface, pas une frontière de sécurité.
 *
 *  Si un standup existe déjà pour ce jour, il est REMPLACÉ (RM9) — écriture atomique
 *  (upsert) sur la contrainte `UNIQUE (userId, jour)` en base, et non un `if` applicatif
 *  que deux onglets contourneraient (RM28). */
export type PostStandupBody = { summary: StandupSummary }
export type PostStandupResponse = Standup
