# Maquettes de l'application de livraison

Prototype cliquable de l'application mobile et de l'administration web. Les données sont fictives et les fonctions comme le micro, le SMS et le paiement sont simulées.

- `index.html` : application mobile
- `admin.html` : administration web
- `src/` : sources des écrans
- `assets/` : logo et icône d'onglet
- `dc-viewer.js` : affichage des écrans avec React

Options d'adresse pour `index.html` : `?start=orders`, `voice`, `market` ou `payments`, et `?theme=sombre`.

Pour lancer le site en local :

```bash
python -m http.server 8123
```

Puis ouvrir `http://localhost:8123`.
