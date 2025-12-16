from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import cloudinary
import cloudinary.uploader
import cloudinary.api
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

# Fichier JSON pour la galerie
GALLERY_FILE = 'data.json'


def load_gallery():
    """Charge la liste des photos stockées dans le JSON."""
    try:
        with open(GALLERY_FILE, 'r') as f:
            data = json.load(f)
            # Compat: accepter soit une liste simple, soit un dict {photos: []}
            if isinstance(data, list):
                return data
            return data.get('photos', [])
    except FileNotFoundError:
        return []


def save_gallery(gallery):
    """Sauvegarde la liste des photos dans le JSON."""
    with open(GALLERY_FILE, 'w') as f:
        json.dump({'photos': gallery}, f, indent=2)

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
