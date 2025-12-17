from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import cloudinary
import cloudinary.uploader
import cloudinary.api
from cloudinary.exceptions import NotFound
import cloudinary.utils
import json
import os
from dotenv import load_dotenv
import uuid
import requests
from io import BytesIO

load_dotenv()

app = Flask(__name__, static_folder='statics', template_folder='templates')
CORS(app)

# Config Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

# Public ID du fichier JSON sur Cloudinary
GALLERY_JSON_ID = 'portfolio/gallery_data'


def load_gallery():
    """Charge la liste des photos stockées dans le JSON sur Cloudinary."""
    try:
        # Obtenir l'URL du fichier JSON sur Cloudinary
        json_url = cloudinary.utils.cloudinary_url(
            GALLERY_JSON_ID,
            resource_type='raw',
            format='json'
        )[0]
        
        # Télécharger le contenu depuis l'URL
        response = requests.get(json_url, timeout=10)
        response.raise_for_status()
        
        # Parser le JSON
        json_data = response.json()
        
        # Compat: accepter soit une liste simple, soit un dict {photos: []}
        if isinstance(json_data, list):
            return json_data
        return json_data.get('photos', [])
    except NotFound:
        # Fichier n'existe pas encore, retourner liste vide
        return []
    except requests.exceptions.RequestException:
        # Erreur de téléchargement, retourner liste vide
        return []
    except Exception as e:
        print(f"Erreur lors du chargement de la galerie: {e}")
        return []


def save_gallery(gallery):
    """Sauvegarde la liste des photos dans le JSON sur Cloudinary."""
    try:
        # Convertir en JSON string
        json_str = json.dumps({'photos': gallery}, indent=2)
        
        # Créer un objet BytesIO pour l'upload
        json_bytes = BytesIO(json_str.encode('utf-8'))
        
        # Upload/Update le fichier JSON sur Cloudinary
        cloudinary.uploader.upload(
            json_bytes,
            public_id=GALLERY_JSON_ID,
            resource_type='raw',
            overwrite=True
        )
    except Exception as e:
        print(f"Erreur lors de la sauvegarde de la galerie: {e}")
        raise

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_image():
    # Vérifie la configuration Cloudinary avant toute action
    if not cloudinary.config().cloud_name:
        return jsonify({'error': 'Cloudinary non configuré (variables manquantes)'}), 500

    if 'image' not in request.files:
        return jsonify({'error': 'Aucune image'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'Aucun fichier sélectionné'}), 400
    
    try:
        # Upload vers Cloudinary
        result = cloudinary.uploader.upload(
            file,
            folder="portfolio/",
            resource_type="image"
        )
        
        # Ajout à la galerie
        gallery = load_gallery()
        new_photo = {
            'id': str(uuid.uuid4()),
            'public_id': result['public_id'],
            'url': cloudinary.CloudinaryImage(result['public_id']).build_url(secure=True),
            'uploaded_at': result['created_at']
        }
        gallery.append(new_photo)
        save_gallery(gallery)
        
        return jsonify({
            'success': True,
            'photo': new_photo
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/gallery')
def get_gallery():
    gallery = load_gallery()
    return jsonify(gallery)

@app.route('/rebuild-gallery', methods=['POST'])
def rebuild_gallery():
    """Reconstruit la galerie depuis toutes les images dans le dossier portfolio/ sur Cloudinary."""
    try:
        # Récupérer toutes les images du dossier portfolio/
        result = cloudinary.api.resources(
            type='upload',
            prefix='portfolio/',
            resource_type='image',
            max_results=500
        )
        
        gallery = []
        for resource in result.get('resources', []):
            photo = {
                'id': str(uuid.uuid4()),
                'public_id': resource['public_id'],
                'url': cloudinary.CloudinaryImage(resource['public_id']).build_url(secure=True),
                'uploaded_at': resource.get('created_at', '')
            }
            gallery.append(photo)
        
        # Sauvegarder la galerie reconstruite
        save_gallery(gallery)
        
        return jsonify({
            'success': True,
            'message': f'Galerie reconstruite avec {len(gallery)} photos',
            'count': len(gallery)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Sur PythonAnywhere, on n'utilise pas cette partie
    # L'app tourne via WSGI
    # Pour tester, on vérifie juste que le code se charge
    print("✓ Application Flask chargée avec succès !")
    print("Sur PythonAnywhere, l'app tournera via WSGI, pas besoin de lancer python app.py")
