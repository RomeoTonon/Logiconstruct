# Logiconstruct — démo pour GitHub Pages

Site complet **sans serveur** : page d'accueil animée + espace admin qui fonctionne.

## Mise en ligne (5 minutes)

1. Sur github.com, créez un dépôt (ou ouvrez le vôtre).
2. **Add file → Upload files** : glissez **tout le contenu** de ce dossier (pas le dossier lui-même),
   y compris le fichier `.nojekyll`. Validez avec **Commit changes**.
3. **Settings → Pages** → *Source* : **Deploy from a branch**, branche **main**, dossier **/ (root)** → **Save**.
4. Après une minute, le site est à l'adresse affichée sur cette page
   (du type `https://votre-compte.github.io/votre-depot/`).

- Page d'accueil : l'adresse ci-dessus.
- Admin : la même adresse + `admin/` (lien aussi en bas de la page d'accueil).
- Mot de passe de l'admin : celui qui vous a été communiqué (modifiable dans l'onglet *Sécurité*).

## Comment marche la démo

GitHub Pages n'héberge que des fichiers : il n'y a pas de serveur ni de base de données.
L'admin enregistre donc tout **dans le navigateur de la personne qui l'utilise** (stockage local) :

- Les chantiers, textes, messages et statistiques modifiés sont visibles **sur cet ordinateur, dans ce navigateur**.
  Un autre visiteur voit la version de départ et a sa propre copie.
- Les statistiques et messages de départ sont des **exemples** pour montrer l'admin.
  Pour repartir de zéro dans un navigateur : effacez les données du site dans les réglages du navigateur.
- Les photos ajoutées sont compressées et stockées dans le navigateur (environ 5 Mo au total).
- Le formulaire de contact enregistre les demandes dans ce même navigateur : elles ne sont **envoyées à personne**.

Pour un vrai site où l'admin modifie le site pour tout le monde et où les demandes arrivent vraiment,
utilisez la version PHP (serveur avec PHP 8.1+).
