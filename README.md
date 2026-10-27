# Une grande nouvelle…

Petit jeu 3D à la première personne (5 minutes environ) pour annoncer le sexe du bébé à la famille et aux amis.
Pensé d'abord pour le téléphone (lien envoyé par WhatsApp), il marche aussi sur ordinateur.

## Le parcours

1. **La chambre de bébé** : bébé a faim, trouver les 3 biberons (sur le tapis, dans le berceau, sur le fauteuil).
2. **La salle de jeux** : compter les nounours, les canards et les ballons pour trouver le code du cadenas.
3. **La salle de musique** : écouter la boîte à musique, puis rejouer la berceuse avec les cubes.
4. **La grande salle** : donner son pronostic, puis ouvrir le cadeau… C'est une fille !

Commandes : toucher le sol pour marcher, toucher ce qui brille, glisser le doigt pour regarder.
Sur ordinateur : clic, glisser la souris, ou flèches / ZQSD.
Le bouton 💡 donne un indice adapté à l'étape ; après deux erreurs, les énigmes donnent la réponse.

## Personnaliser

En haut de `jeu.js`, l'objet `CONFIG` :

```js
const CONFIG = {
  signature: 'Les futurs parents',   // signé en bas du message final
  message: 'Nous avons tellement hâte de vous la présenter !',
  arrivee: '',                        // ex. 'Arrivée prévue : mars 2027'
  code: [2, 5, 3],                    // nounours, canards, ballons de la salle de jeux
};
```

Ne changer `code` que si l'on ajoute ou retire des nounours, canards ou ballons dans la salle de jeux.

## Publier

Aucune compilation : il suffit de servir les fichiers tels quels (Three.js r128 est dans `lib/`, rien n'est chargé depuis l'extérieur).
Avec GitHub Pages : *Settings → Pages → Deploy from a branch*, choisir la branche puis `/ (root)`.
L'adresse sera `https://francoisguitare.github.io/surprise/` (l'image d'aperçu WhatsApp, `apercu.jpg`, est déclarée pour cette adresse dans `index.html`).

Pour tester sur son ordinateur : `python3 -m http.server` dans le dossier, puis ouvrir `http://localhost:8000`.
Avec `?debug` dans l'adresse, `window.__jeu` expose l'état du jeu pour les tests automatiques.

## Fichiers

- `index.html` : page, styles, écrans (titre, cadenas, pronostic, fin).
- `jeu.js` : la scène 3D, les quatre pièces, les énigmes, les déplacements, les sons (tous synthétisés, berceuse « Ah ! vous dirai-je, maman »).
- `apercu.jpg` : image d'aperçu pour les liens partagés (la chambre, sans rien dévoiler).
