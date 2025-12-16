from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import cloudinary
import cloudinary.uploader
import cloudinary.api
from cloudinary.exceptions import NotFound
import json
import os
from dotenv import load_dotenv
import uuid

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
        # Télécharger le JSON depuis Cloudinary
        result = cloudinary.api.resource(GALLERY_JSON_ID, resource_type='raw')
        json_data = json.loads(result['content'])
        
        # Compat: accepter soit une liste simple, soit un dict {photos: []}
        if isinstance(json_data, list):
            return json_data
        return json_data.get('photos', [])
    except NotFound:
        # Fichier n'existe pas encore, retourner liste vide
        return []
    except Exception as e:
        print(f"Erreur lors du chargement de la galerie: {e}")
        return []


def save_gallery(gallery):
    """Sauvegarde la liste des photos dans le JSON sur Cloudinary."""
    try:
        # Convertir en JSON string
        json_str = json.dumps({'photos': gallery}, indent=2)
        
        # Upload/Update le fichier JSON sur Cloudinary
        cloudinary.uploader.upload(
            json_str.encode('utf-8'),
            public_id=GALLERY_JSON_ID,
            resource_type='raw',
            overwrite=True,
            format='json'
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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
