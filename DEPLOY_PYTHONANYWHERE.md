# Guide de déploiement sur PythonAnywhere

## Étape 1 : Créer un compte

1. Allez sur [pythonanywhere.com](https://www.pythonanywhere.com/)
2. Cliquez sur **"Create Beginner account"** (gratuit)
3. Remplissez le formulaire :
   - Username (sera votre sous-domaine : `votre-username.pythonanywhere.com`)
   - Email
   - Mot de passe
4. Confirmez votre email

## Étape 2 : Préparer votre code sur GitHub

Assurez-vous que votre code est sur GitHub :
- Votre repo : `https://github.com/Urioxi/portfolio.git`

## Étape 3 : Se connecter à PythonAnywhere

1. Connectez-vous sur [pythonanywhere.com](https://www.pythonanywhere.com/)
2. Vous arrivez sur le **Dashboard**

## Étape 4 : Ouvrir un Bash Console

1. Dans le Dashboard, cliquez sur **"Consoles"** (menu du haut)
2. Cliquez sur **"Bash"** pour ouvrir un terminal

## Étape 5 : Cloner votre repo GitHub

Dans le terminal Bash, tapez :

```bash
cd ~
git clone https://github.com/Urioxi/portfolio.git
cd portfolio
```

## Étape 6 : Créer un environnement virtuel

```bash
# Créer l'environnement virtuel
python3.10 -m venv venv

# Activer l'environnement
source venv/bin/activate

# Installer les dépendances
pip install --user -r requirements.txt
```

⚠️ **Note** : PythonAnywhere utilise `pip install --user` pour installer dans votre espace utilisateur.

## Étape 7 : Configurer les variables d'environnement

```bash
# Créer le fichier .env
nano .env
```

Ajoutez vos identifiants Cloudinary :
```
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
```

Sauvegardez : `Ctrl + X`, puis `Y`, puis `Enter`

## Étape 8 : Tester l'application localement

```bash
# Toujours dans l'environnement virtuel
python app.py
```

Si ça fonctionne, arrêtez avec `Ctrl + C`

## Étape 9 : Configurer l'application Web

1. Dans le Dashboard, cliquez sur **"Web"** (menu du haut)
2. Cliquez sur **"Add a new web app"**
3. Choisissez **"Flask"**
4. Choisissez **"Python 3.10"**
5. Laissez le chemin par défaut : `/home/votre-username/mysite/flask_app.py`
6. Cliquez **"Next"**

## Étape 10 : Modifier le fichier WSGI

1. Dans la page Web, vous verrez un lien **"WSGI configuration file"**
2. Cliquez dessus
3. Remplacez TOUT le contenu par :

```python
import sys

# Ajouter le chemin de votre projet
path = '/home/votre-username/portfolio'
if path not in sys.path:
    sys.path.append(path)

# Activer l'environnement virtuel
activate_this = '/home/votre-username/portfolio/venv/bin/activate_this.py'
with open(activate_this) as file_:
    exec(file_.read(), dict(__file__=activate_this))

# Charger les variables d'environnement
from dotenv import load_dotenv
import os
load_dotenv('/home/votre-username/Photography-portfolio/.env')

# Importer l'application Flask
from app import app as application

if __name__ == "__main__":
    application.run()
```

⚠️ **IMPORTANT** : Remplacez `votre-username` par votre vrai username PythonAnywhere partout dans le fichier !

4. Cliquez sur **"Save"**

## Étape 11 : Configurer les chemins statiques

1. Toujours dans la page **Web**
2. Dans la section **"Static files"**, ajoutez :

**URL** : `/static/`  
**Directory** : `/home/votre-username/portfolio/statics`

3. Cliquez sur **"Add a new static files mapping"**

## Étape 12 : Activer l'application

1. Toujours dans la page **Web**
2. Cliquez sur le gros bouton vert **"Reload"** en haut à droite
3. Attendez quelques secondes

## Étape 13 : Accéder à votre site !

Votre site est maintenant accessible à :
**`http://votre-username.pythonanywhere.com`**

## Vérification

1. Ouvrez votre site dans un navigateur
2. Testez l'upload d'une photo
3. Vérifiez que la galerie s'affiche

## Commandes utiles

### Mettre à jour le code

```bash
cd ~/portfolio
git pull
source venv/bin/activate
pip install --user -r requirements.txt
```

Puis dans le Dashboard → Web → **Reload**

### Voir les logs

Dans la page **Web**, section **"Error log"** ou **"Server log"**

### Redémarrer l'app

Dans la page **Web**, cliquez sur **"Reload"**

## Problèmes courants

### Erreur "Module not found"
- Vérifiez que vous avez bien installé les dépendances avec `pip install --user`
- Vérifiez que le chemin dans le WSGI est correct

### Erreur "Environment variable not found"
- Vérifiez que le fichier `.env` existe et contient les bonnes variables
- Vérifiez le chemin dans le WSGI : `load_dotenv('/home/votre-username/portfolio/.env')`

### Les images ne s'affichent pas
- Vérifiez la configuration des fichiers statiques dans la page Web
- Vérifiez que le dossier `statics` existe

## Limites du plan gratuit

- **512 Mo** de stockage
- **1 app web** gratuite
- Domaine : `votre-username.pythonanywhere.com`
- Limites CPU (mais suffisant pour un portfolio)

## Passer à un plan payant (optionnel)

Si vous voulez :
- Un domaine personnalisé
- Plus de stockage
- Plus de ressources

Allez dans **"Account"** → **"Upgrade"**

---

**C'est tout ! Votre site est maintenant en ligne 24/7 ! 🎉**

