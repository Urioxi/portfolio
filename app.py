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

# Mot de passe admin (défini dans .env)
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD')
# Config Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
    
)

# Fichier JSON local (sur PythonAnywhere, on stocke localement car les connexions HTTPS sortantes sont bloquées)
GALLERY_FILE = 'data.json'
STATS_FILE = 'stats.json'


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
            
            # Migration : convertir l'ancien format vers le nouveau
            updated = False
            for photo in photos:
                # Si ancien format avec 'category' (string), convertir en 'categories' (list)
                if 'category' in photo and 'categories' not in photo:
                    photo['categories'] = [photo['category']] if photo['category'] else ['Non catégorisé']
                    updated = True
                # Si pas de catégories du tout, ajouter par défaut
                elif 'categories' not in photo:
                    photo['categories'] = ['Non catégorisé']
                    updated = True
                # S'assurer qu'il y a toujours un texte descriptif et un titre
                if 'description' not in photo:
                    photo['description'] = ''
                    updated = True
                if 'title' not in photo:
                    photo['title'] = ''
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
        # Support ancien format (string) et nouveau format (list)
        if photo.get('categories'):
            categories.update(photo['categories'])
        elif photo.get('category'):
            categories.add(photo['category'])
    return sorted(list(categories))

def load_stats():
    """Charge les statistiques de visites."""
    try:
        with open(STATS_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {
            'unique_visits': set(),
            'total_visits': 0
        }

def save_stats(stats):
    """Sauvegarde les statistiques de visites."""
    # Convertir le set en list pour JSON
    stats_to_save = {
        'unique_visits': list(stats['unique_visits']),
        'total_visits': stats['total_visits']
    }
    with open(STATS_FILE, 'w') as f:
        json.dump(stats_to_save, f, indent=2)

def track_visit():
    """Enregistre une visite unique."""
    if not session.get('visitor_id'):
        # Créer un ID unique pour ce visiteur
        session['visitor_id'] = str(uuid.uuid4())
    
    stats = load_stats()
    # Convertir la list en set pour les opérations
    if isinstance(stats['unique_visits'], list):
        stats['unique_visits'] = set(stats['unique_visits'])
    
    visitor_id = session.get('visitor_id')
    if visitor_id not in stats['unique_visits']:
        stats['unique_visits'].add(visitor_id)
    
    stats['total_visits'] = stats.get('total_visits', 0) + 1
    save_stats(stats)

def get_unique_visits_count():
    """Retourne le nombre de visites uniques."""
    stats = load_stats()
    if isinstance(stats['unique_visits'], list):
        return len(stats['unique_visits'])
    return len(stats['unique_visits'])

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
    track_visit()
    return render_template('index.html')

@app.route('/gallery-page')
def gallery_page():
    """Page galerie publique avec filtrage par catégorie."""
    track_visit()
    return render_template('gallery.html')

@app.route('/perso')
def perso():
    """Page personnelle."""
    return render_template('perso.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Page de connexion admin."""
    if request.method == 'POST':
        password = request.form.get('password', '')
        if password == ADMIN_PASSWORD:
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
    unique_visits = get_unique_visits_count()
    
    stats = {
        'total_photos': len(gallery),
        'categories': len(categories),
        'unique_visits': unique_visits,
        'photos_by_category': {}
    }
    
    for category in categories:
        stats['photos_by_category'][category] = len([
            p for p in gallery 
            if category in (p.get('categories') or [p.get('category')] if p.get('category') else [])
        ])
    
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
            'categories': [category] if category else ['Non catégorisé'],
            'description': '',
            'title': ''
        }
        gallery.append(new_photo)
        save_gallery(gallery)
        
        return jsonify({
            'success': True,
            'photo': new_photo
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/delete-photo/<photo_id>', methods=['DELETE'])
@login_required
def delete_photo(photo_id):
    """Supprime une photo de la galerie."""
    try:
        gallery = load_gallery()
        gallery = [p for p in gallery if p.get('id') != photo_id]
        save_gallery(gallery)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/update-photo/<photo_id>', methods=['PUT'])
@login_required
def update_photo(photo_id):
    """Met à jour les catégories et/ou la description d'une photo."""
    try:
        data = request.json
        gallery = load_gallery()
        
        for photo in gallery:
            if photo.get('id') == photo_id:
                if 'categories' in data:
                    photo['categories'] = data['categories']
                if 'description' in data:
                    photo['description'] = data['description']
                if 'title' in data:
                    photo['title'] = data['title']
                save_gallery(gallery)
                return jsonify({'success': True, 'photo': photo})
        
        return jsonify({'error': 'Photo non trouvée'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/create-category', methods=['POST'])
@login_required
def create_category():
    """Crée une nouvelle catégorie (juste pour la liste, pas de modification de photos)."""
    try:
        data = request.json
        category_name = data.get('name', '').strip()
        
        if not category_name:
            return jsonify({'error': 'Nom de catégorie requis'}), 400
        
        # Les catégories sont automatiquement créées quand on les utilise
        # Cette route sert juste à valider
        return jsonify({'success': True, 'category': category_name})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/gallery')
def get_gallery():
    """API pour récupérer la galerie, avec filtrage optionnel par catégorie."""
    category = request.args.get('category', None)
    gallery = load_gallery()
    
    if category:
        # Support ancien et nouveau format
        gallery = [p for p in gallery if category in (p.get('categories') or [p.get('category')] if p.get('category') else [])]
    
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

# Pour PythonAnywhere, pas de app.run() - le serveur WSGI gère cela
