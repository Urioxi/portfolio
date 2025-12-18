from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from functools import wraps
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
import hashlib
import time
from datetime import datetime

load_dotenv()

app = Flask(__name__, static_folder='statics', template_folder='templates')
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
CORS(app)

admin_password=os.getenv('ADMIN_PASSWORD')

# Config Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

# Fichier JSON local (sur PythonAnywhere, on stocke localement car les connexions HTTPS sortantes sont bloquées)
GALLERY_FILE = 'data.json'


def load_gallery():
    """Charge la liste des photos stockées dans le JSON local."""
    try:
        with open(GALLERY_FILE, 'r') as f:
            data = json.load(f)
            # Compat: accepter soit une liste simple, soit un dict {photos: []}
            if isinstance(data, list):
                photos = data
            else:
                photos = data.get('photos', [])
            
            # Migration : ajouter une catégorie par défaut aux photos qui n'en ont pas
            updated = False
            for photo in photos:
                if 'category' not in photo:
                    photo['category'] = 'Non catégorisé'
                    updated = True
            
            if updated:
                save_gallery(photos)
            
            return photos
    except FileNotFoundError:
        # Fichier n'existe pas encore, retourner liste vide
        return []
    except Exception as e:
        print(f"Erreur lors du chargement de la galerie: {e}")
        return []


def save_gallery(gallery):
    """Sauvegarde la liste des photos dans le JSON local."""
    try:
        with open(GALLERY_FILE, 'w') as f:
            json.dump({'photos': gallery}, f, indent=2)
    except Exception as e:
        print(f"Erreur lors de la sauvegarde de la galerie: {e}")
        raise

def get_categories():
    """Récupère toutes les catégories uniques depuis la galerie."""
    gallery = load_gallery()
    categories = set()
    for photo in gallery:
        if photo.get('category'):
            categories.add(photo['category'])
    return sorted(list(categories))

def login_required(f):
    """Décorateur pour protéger les routes admin."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/gallery-page')
def gallery_page():
    """Page galerie publique avec filtrage par catégorie."""
    return render_template('gallery.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Page de connexion admin."""
    if request.method == 'POST':
        password = request.form.get('password', '')
        if password == admin_password:
            session['logged_in'] = True
            return redirect(url_for('admin_stats'))
        else:
            return render_template('login.html', error='Mot de passe incorrect')
    return render_template('login.html')

@app.route('/logout')
def logout():
    """Déconnexion admin."""
    session.pop('logged_in', None)
    return redirect(url_for('index'))

@app.route('/admin/stats')
@login_required
def admin_stats():
    """Page de statistiques admin."""
    gallery = load_gallery()
    categories = get_categories()
    
    stats = {
        'total_photos': len(gallery),
        'categories': len(categories),
        'photos_by_category': {}
    }
    
    for category in categories:
        stats['photos_by_category'][category] = len([p for p in gallery if p.get('category') == category])
    
    return render_template('admin_stats.html', stats=stats, categories=categories, gallery=gallery)

@app.route('/get-signature', methods=['GET'])
def get_signature():
    """Génère une signature Cloudinary pour l'upload direct depuis le navigateur."""
    try:
        cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')
        api_key = os.getenv('CLOUDINARY_API_KEY')
        api_secret = os.getenv('CLOUDINARY_API_SECRET')
        
        if not all([cloud_name, api_key, api_secret]):
            return jsonify({'error': 'Cloudinary non configuré'}), 500
        
        # Paramètres pour l'upload
        timestamp = int(time.time())
        folder = "portfolio"
        
        # Créer la signature
        params_to_sign = {
            'timestamp': timestamp,
            'folder': folder
        }
        
        # Trier les paramètres et créer la string à signer
        params_string = '&'.join([f"{k}={v}" for k, v in sorted(params_to_sign.items())])
        signature_string = f"{params_string}{api_secret}"
        signature = hashlib.sha1(signature_string.encode('utf-8')).hexdigest()
        
        return jsonify({
            'cloud_name': cloud_name,
            'api_key': api_key,
            'timestamp': timestamp,
            'signature': signature,
            'folder': folder
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/add-photo', methods=['POST'])
def add_photo():
    """Ajoute une photo à la galerie après upload direct vers Cloudinary."""
    try:
        data = request.json
        public_id = data.get('public_id')
        uploaded_at = data.get('created_at', '')
        category = data.get('category', 'Non catégorisé')
        
        if not public_id:
            return jsonify({'error': 'public_id manquant'}), 400
        
        # Ajout à la galerie
        gallery = load_gallery()
        new_photo = {
            'id': str(uuid.uuid4()),
            'public_id': public_id,
            'url': cloudinary.CloudinaryImage(public_id).build_url(secure=True),
            'uploaded_at': uploaded_at,
            'category': category
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
    """API pour récupérer la galerie, avec filtrage optionnel par catégorie."""
    category = request.args.get('category', None)
    gallery = load_gallery()
    
    if category:
        gallery = [p for p in gallery if p.get('category') == category]
    
    return jsonify(gallery)

@app.route('/categories')
def get_categories_api():
    """API pour récupérer toutes les catégories."""
    categories = get_categories()
    return jsonify(categories)

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
    port = int(os.environ.get('PORT', 5000))
    app.run(host='127.0.0.1', port=port, debug=True)
