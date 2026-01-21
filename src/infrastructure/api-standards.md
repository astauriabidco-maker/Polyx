# Endpoints API Polyx Lead

Authentification par clé API via l'en-tête `X-API-Key`. Toutes les réponses sont au format JSON.

## 1. Récupérer les branches autorisées

- **URL** : `/api/v1/branches`
- **Méthodes** : `GET` ou `POST`
- **Headers** :
  - `Content-Type: application/json`
  - `X-API-Key: <VOTRE_API_KEY>`
- **Corps** : vide (`{}`) si POST
- **Réponse succès (200)** :
```json
{
  "success": true,
  "branches": [
    {"id": 3, "name": "SAINT DENIS"},
    {"id": 5, "name": "PARIS"}
  ]
}
```
- **Erreurs possibles** :
  - 401 : clé absente ou invalide

## 2. Récupérer les examens autorisés

- **URL** : `/api/v1/examens`
- **Méthodes** : `GET` ou `POST`
- **Headers** :
  - `Content-Type: application/json`
  - `X-API-Key: <VOTRE_API_KEY>`
- **Corps** : vide (`{}`) si POST
- **Réponse succès (200)** :
```json
{
  "success": true,
  "examens": [
    {"id": 12, "name": "TOEIC", "default_code": "TOEIC-A"},
    {"id": 18, "name": "BRIGHT", "default_code": ""}
  ]
}
```
- **Erreurs possibles** :
  - 401 : clé absente ou invalide

## 3. Création de leads en bulk

- **URL** : `/api/v1/leads/bulk`
- **Méthodes** : `POST`
- **Headers** :
  - `Content-Type: application/json`
  - `X-API-Key: <VOTRE_API_KEY>`
- **Corps (exemple)** :
```json
{
  "leads": [
    {
      "first_name": "Jean",
      "last_name": "Dupont",
      "email": "jean.dupont@example.com",
      "phone": "+33600000001",
      "zip": "75015",
      "city": "Paris",
      "street": "10 rue de Paris",
      "examen_id": 12,
      "branch_id": 3,
      "source": "terrain",
      "date_consentement": "2025-12-01",
      "date_reponse": "2025-12-15"
    },
    {
      "first_name": "Maria",
      "last_name": "Lopez",
      "email": "maria.lopez@example.com",
      "phone": "+33600000002",
      "zip": "69000",
      "city": "Lyon",
      "street": "5 avenue des Alpes",
      "examen_id": 18,
      "branch_id": 5,
      "source": "facebook",
      "date_consentement": "2025-11-20",
      "date_reponse": "2025-12-15"
    }
  ]
}
```

- **Champs disponibles** :
  - **Requis** : `first_name`, `email`, `phone`, `examen_id`, `branch_id`, `source`, `date_consentement`, `date_reponse`
  - **Optionnels** :
    - `last_name` : Nom de famille (string)
    - `zip` : Code postal (string)
    - `city` : Ville (string)
    - `street` : Rue/Adresse (string)

- **Valeurs possibles pour `source`** :
  - `"meta"` : Meta
  - `"facebook"` : Facebook
  - `"linkedin"` : LinkedIn
  - `"terrain"` : Terrain
  - `"tiktok"` : TikTok
  - `"standard"` : Standard
  - `"agence"` : Agence
  - `"website"` : Site Web
  - `"apporteur_affaire"` : Apporteur d'Affaire
  - `"api"` : API (valeur par défaut si c'est non remplit)
  - `"autre"` : Autre

- **Réponse succès (200)** :
```json
{
  "success": true,
  "created": 2,
  "created_prospection": 1,
  "created_crm": 1,
  "total": 2,
  "errors": []
}
```

- **Champs de la réponse** :
  - `success` : Indique si l'opération a réussi (boolean)
  - `created` : Nombre total de leads créés (integer)
  - `created_prospection` : Nombre de leads créés dans `prospection.prospect` (integer)
  - `created_crm` : Nombre de leads créés dans `crm.lead` (integer)
  - `total` : Nombre total de leads dans la requête (integer)
  - `errors` : Liste des erreurs par lead (array)

- **Réponse partielle (exemple)** :
```json
{
  "success": true,
  "created": 1,
  "created_prospection": 0,
  "created_crm": 1,
  "total": 2,
  "errors": [
    {
      "index": 1,
      "error": "La branche ID 99 n'est pas autorisée pour cet utilisateur API."
    }
  ]
}
```

## Règles de validation sur `/leads/bulk`

- Champs requis par lead : `first_name`, `email`, `phone`, `examen_id`, `branch_id`, `source`, `date_consentement`, `date_reponse`
- `examen_id` doit être autorisé pour l'API User (lié dans sa fiche)
- `branch_id` doit être autorisé pour l'API User (lié dans sa fiche)
- `source` doit être une valeur valide (voir liste des valeurs possibles ci-dessus)
- `date_consentement` et `date_reponse` doivent être au format `YYYY-MM-DD`
- Les validations Odoo natives (unicité, champs obligatoires, etc.) s'appliquent

## Logique de routage des leads

Les leads sont automatiquement routés vers deux modèles différents selon la valeur de `date_reponse` (champ requis) :

- **`prospection.prospect`** : Si `date_reponse` est **ancienne** (plus de 30 jours par rapport à aujourd'hui)

- **`crm.lead`** : Si `date_reponse` est **récente** (30 jours ou moins par rapport à aujourd'hui)

**Exemples** :
- Lead avec `date_reponse = "2024-11-01"` (aujourd'hui = 2025-12-17, soit 411 jours) → `prospection.prospect`
- Lead avec `date_reponse = "2025-12-10"` (aujourd'hui = 2025-12-17, soit 7 jours) → `crm.lead`

## Codes d'erreur courants

- 400 : JSON invalide ou format incorrect (`leads` manquant ou vide)
- 401 : clé API absente ou invalide
- 200 avec erreurs partielles : `success: true` mais tableau `errors` listant les rejets individuels
