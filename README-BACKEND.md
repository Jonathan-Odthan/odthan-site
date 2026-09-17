# ODTHAN — site + backend

Frontend statique (HTML/CSS/JS, aucun framework, aucune étape de build) +
API en Vercel Serverless Functions (Node.js) pour les formulaires, les
réservations et le tableau de bord admin.

## 1. Provisionner une base de données PostgreSQL

Choisis un fournisseur (tous ont un plan gratuit qui suffit pour démarrer) :
- **Vercel Postgres** (le plus simple si tu déploies déjà sur Vercel — onglet "Storage" du projet)
- **Neon** (neon.tech)
- **Supabase** (supabase.com)

Récupère la chaîne de connexion (`postgres://user:password@host:5432/dbname`).

Applique le schéma une seule fois :
```bash
psql "$DATABASE_URL" -f db/schema.sql
```

## 2. Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable       | Description                                          |
|----------------|-------------------------------------------------------|
| `DATABASE_URL` | Chaîne de connexion Postgres                          |
| `JWT_SECRET`   | Valeur aléatoire longue pour signer les sessions admin |

Génère un secret solide :
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Voir `.env.example`.

## 3. Créer le premier compte admin

En local, avec `DATABASE_URL` pointant vers ta base de production :
```bash
npm install
DATABASE_URL="postgres://..." node scripts/seed-admin.js admin@odthan.com "UnMotDePasseTresFort123!"
```
Le script hache le mot de passe (bcrypt, 12 rounds) — aucun mot de passe en clair n'est stocké.

## 4. Déployer sur Vercel

```bash
vercel --prod
```
ou via l'import GitHub habituel. Aucune configuration de build n'est nécessaire :
- les fichiers `.html`/`.css`/`.js` à la racine sont servis tels quels ;
- tout fichier dans `/api` devient automatiquement une fonction serverless ;
- `vercel.json` ajoute les en-têtes de sécurité (CSP, HSTS, X-Frame-Options, etc.).

Connecte ensuite le domaine `www.odthan.com` dans Settings → Domains (HTTPS géré automatiquement).

## 5. Accéder au tableau de bord

`https://www.odthan.com/admin/login.html` — connecte-toi avec le compte créé à l'étape 3.
Le dashboard liste les messages de contact, les réservations, les demandes
"Kòmanse biznis mwen", et permet de changer le numéro WhatsApp affiché sur le
site : chaque page publique récupère ce numéro via `/api/settings` au
chargement et met à jour le bouton flottant en conséquence (avec repli sur le
numéro par défaut si le backend n'est pas configuré).

## Ce qui est réellement fonctionnel

- **Formulaires publics** (contact, réservation, kòmanse biznis) : validation
  stricte côté serveur (Zod), assainissement des entrées, honeypot anti-bot,
  écriture réelle en base PostgreSQL.
- **Anti double-réservation réel** : contrainte unique en base sur
  `(slot_date, slot_time)` — deux réservations ne peuvent pas prendre le même
  créneau, même en cas de requêtes simultanées (protégé au niveau base de
  données, pas seulement côté application).
- **Rate limiting persistant** : stocké en base (les fonctions serverless
  n'ont pas de mémoire partagée entre invocations, un limiteur en mémoire ne
  protégerait rien sur Vercel).
- **Authentification admin** : mots de passe hachés (bcrypt, 12 rounds),
  sessions JWT en cookie `HttpOnly; Secure; SameSite=Lax`, verrouillage de
  compte après 5 échecs (15 minutes), journal d'audit des connexions et des
  actions admin.
- **CSRF** : jeton double-soumission (cookie + en-tête `X-CSRF-Token`) exigé
  pour toute action admin qui modifie des données.
- **RBAC** : rôles `admin` / `editor` ; seul `admin` peut modifier les
  réglages du site.
- **En-têtes de sécurité** : CSP stricte (aucun script inline autorisé),
  HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- **Échecs honnêtes** : si `DATABASE_URL` ou `JWT_SECRET` ne sont pas
  configurés, l'API répond clairement "service non configuré" (503) au lieu
  de simuler un succès.

## Limites connues (à faire évoluer)

- **Sauvegardes** : dépend du fournisseur Postgres choisi (Vercel
  Postgres/Neon/Supabase font des sauvegardes automatiques sur les plans
  payants) — rien n'est simulé ici, à vérifier selon le plan choisi.
- **Emails/SMS de confirmation et rappels** : pas encore implémentés (aucun
  fournisseur d'e-mail n'est configuré). Les tables sont prêtes pour brancher
  un job derrière (Resend, SendGrid, etc.).
- **CMS blog/FAQ/témoignages** : le dashboard actuel couvre messages,
  réservations, demandes de création d'entreprise et réglages — pas encore
  l'édition du contenu du blog ou de la FAQ depuis l'admin.
- **Intégrations tierces** (registrar de domaine, Meta, Google Business,
  Analytics) : non implémentées, conformément au principe déjà en place sur
  l'écosystème ODTHAN de ne jamais simuler un résultat pour une intégration
  non configurée.

## Tests effectués avant livraison

Toute la chaîne a été testée avec une vraie base PostgreSQL locale (pas de
simulation) : validation des formulaires, honeypot (les soumissions de bots
ne sont pas enregistrées), rate limiting (blocage after 5 requêtes/10 min),
anti double-réservation (409 sur créneau déjà pris), connexion admin,
verrouillage de compte après 5 échecs, protection CSRF sur les actions
admin, et réponses honnêtes "service non configuré" quand les variables
d'environnement manquent.
