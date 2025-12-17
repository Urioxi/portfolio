# Fichier WSGI pour PythonAnywhere
# Copiez ce contenu dans votre fichier WSGI sur PythonAnywhere
# N'oubliez pas de remplacer 'votre-username' par votre vrai username !

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
load_dotenv('/home/votre-username/portfolio/.env')

# Importer l'application Flask
from app import app as application

if __name__ == "__main__":
    application.run()

