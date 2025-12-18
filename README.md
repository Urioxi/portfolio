# Portfolio Photographique

### Backend
- **Flask** : Framework web Python pour créer l'API et servir les pages HTML
- **Cloudinary** : Service cloud pour stocker et servir les images
- **python-dotenv** : Gestion des variables d'environnement (clés API, secrets)
- **Flask-CORS** : Gestion des requêtes cross-origin pour l'upload direct vers Cloudinary
- **Gunicorn** : Serveur WSGI pour déployer l'application en production

### Frontend
- **Tailwind CSS** : Framework CSS utilitaire pour le design responsive (via CDN) et pour l'efficacité
- **JavaScript** : Gestion des interactions utilisateur, upload d'images, modals, slider
- **HTML/CSS** : Structure et styles personnalisés

### Stockage des données
- **JSON** : Fichiers locaux (`data.json` pour les photos, `stats.json` pour les statistiques)
- **Cloudinary** : Stockage des images en ligne

### Fonctionnalités principales
- Upload d'images vers Cloudinary avec signature sécurisée
- Système de catégories pour organiser les photos
- Recherche par titre dans la galerie et l'admin
- Authentification admin avec session Flask
- Statistiques de visites uniques
- Slider automatique sur la page d'accueil
- Affichage plein écran des photos

## Déploiement

Le site est conçu pour être déployé sur PythonAnywhere. Voir les fichiers de documentation pour plus de détails.



