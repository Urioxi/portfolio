# Configuration du Portfolio

## ⚠️ Sécurité importante

**NE COMMITEZ JAMAIS** le fichier `.env` sur GitHub ! Il contient des informations sensibles.

## Variables d'environnement requises

Copiez le contenu ci-dessous dans un fichier `.env` à la racine du projet :

```bash
# Clés Cloudinary (obligatoire pour l'upload d'images)
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret

# Clé secrète pour les sessions Flask (important pour la sécurité)
SECRET_KEY=votre_cle_secrete_unique_tres_longue_et_complexe

# 🔐 Mot de passe admin (CHANGEZ la valeur par défaut !)
ADMIN_PASSWORD=admin123
```

## Instructions de configuration

1. **Créez le fichier .env** :
   ```bash
   cp CONFIG_EXAMPLE.md .env
   # Puis modifiez les valeurs dans .env
   ```

2. **Remplacez toutes les valeurs** par vos vraies informations :
   - Obtenez vos clés Cloudinary sur https://cloudinary.com
   - Générez une SECRET_KEY complexe (au moins 32 caractères)
   - **CHANGEZ** `ADMIN_PASSWORD=admin123` par un mot de passe FORT et UNIQUE

3. **Sur PythonAnywhere** :
   - Allez dans Web > Variables
   - Ajoutez chaque variable avec sa vraie valeur

## Sécurité

- Le fichier `.env` est dans `.gitignore` - il ne sera pas commité
- Changez régulièrement vos mots de passe
- N'utilisez jamais de valeurs par défaut en production
