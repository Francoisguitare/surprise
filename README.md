# Surprise !

Petit jeu 3D à la première personne (6 à 8 minutes) pour annoncer à la famille et aux amis que Sylvie et Wissam vont être parents, puis le sexe du bébé.
Pensé d'abord pour le téléphone (lien envoyé par WhatsApp), il marche aussi sur ordinateur.

Rien n'annonce la nouvelle à l'ouverture : titre « Surprise ! », salon neutre, étapes à venir affichées « ? », image d'aperçu du salon.

## Le parcours

1. **Le salon** : le tableau est tombé, retrouver ses 4 morceaux (table basse, canapé, bibliothèque, près de la plante).
2. **Le tableau** : remettre les 4 morceaux en ordre. L'image apparaît (« Sylvie + Wissam = 3 ! ») et le jeu annonce : **Sylvie et Wissam vont être parents !** La porte s'ouvre.
3. **La chambre de bébé** : bébé a faim, trouver les 3 biberons (sur le tapis, dans le berceau, sur le fauteuil).
4. **La salle de jeux** : compter les nounours, les canards et les ballons pour trouver le code du cadenas.
5. **La salle de musique** : écouter la boîte à musique, puis rejouer la mélodie avec les cubes.
6. **La grande salle** : donner son pronostic, puis ouvrir le cadeau… C'est une fille !

Commandes : toucher le sol pour marcher, toucher ce qui brille, glisser le doigt pour regarder.
Sur ordinateur : clic, glisser la souris, ou flèches / ZQSD.
Le bouton 💡 donne un indice adapté à l'étape ; après deux erreurs, les énigmes donnent la réponse.

## Personnaliser

En haut de `jeu.js`, l'objet `CONFIG` :

```js
const CONFIG = {
  prenoms: ['Sylvie', 'Wissam'],     // les futurs parents
  signature: 'Sylvie et Wissam',     // signé en bas du message final
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

- `index.html` : page, styles, écrans (titre, tableau, annonce, cadenas, pronostic, fin).
- `jeu.js` : la scène 3D, les cinq pièces, les énigmes, les déplacements, les sons (tous synthétisés).
- `apercu.jpg` : image d'aperçu pour les liens partagés (le salon, sans rien dévoiler).
