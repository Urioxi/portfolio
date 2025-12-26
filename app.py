# -*- coding: utf-8 -*-
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

# Liste des administrateurs
ADMINS = ['Urioxi', 'noemie.mrn21']

load_dotenv()


app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
CORS(app)

# Mot de passe admin (défini dans .env, valeur par défaut pour dev)
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin123')

# Config Cloudinary (seulement si les variables sont définies)
cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')
api_key = os.getenv('CLOUDINARY_API_KEY')
api_secret = os.getenv('CLOUDINARY_API_SECRET')

if cloud_name and api_key and api_secret:
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret
    )
    CLOUDINARY_CONFIGURED = True
else:
    print("WARNING: Cloudinary non configure - mode degrade active")
    CLOUDINARY_CONFIGURED = False
# Définir le répertoire de données en fonction de l'environnement
GALLERY_FILE = 'data.json'
STATS_FILE = 'stats.json'
USERS_FILE = 'users.json'
MESSAGES_FILE = 'messages.json'


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

# Gestion des utilisateurs
def load_users():
    """Charge les utilisateurs depuis le JSON."""
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_users(users):
    """Sauvegarde les utilisateurs dans le JSON."""
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def hash_password(password):
    """Hash un mot de passe avec SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()

def create_user(username, password):
    """Crée un nouvel utilisateur."""
    users = load_users()
    username_lower = username.lower()

    # Vérifier si le nom d'utilisateur existe déjà (insensible à la casse)
    for existing_username in users:
        if existing_username.lower() == username_lower:
            return False, "Nom d'utilisateur déjà pris"

    users[username] = {
        'password': hash_password(password),
        'created_at': datetime.now().isoformat(),
        'is_admin': False
    }
    save_users(users)
    return True, "Compte créé avec succès"

def authenticate_user(username, password):
    """Authentifie un utilisateur."""
    users = load_users()
    username_lower = username.lower()

    # Trouver l'utilisateur en ignorant la casse
    actual_username = None
    for existing_username in users:
        if existing_username.lower() == username_lower:
            actual_username = existing_username
            break

    if actual_username is None:
        return False, "Utilisateur non trouvé"

    if users[actual_username]['password'] != hash_password(password):
        return False, "Mot de passe incorrect"

    return True, users[actual_username]

# Gestion des messages
def load_messages():
    """Charge les messages depuis le JSON."""
    try:
        with open(MESSAGES_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save_messages(messages):
    """Sauvegarde les messages dans le JSON."""
    with open(MESSAGES_FILE, 'w') as f:
        json.dump(messages, f, indent=2)

def get_user_messages(username):
    """Récupère les messages d'un utilisateur."""
    messages = load_messages()
    user_messages = [msg for msg in messages if msg['to'] == username]

    # S'assurer que tous les messages ont la propriété 'read'
    for msg in user_messages:
        if 'read' not in msg:
            msg['read'] = False

    return user_messages

def get_unread_count(username):
    """Compte les messages non lus d'un utilisateur."""
    messages = get_user_messages(username)
    return len([msg for msg in messages if not msg.get('read', False)])

def send_message(from_user, to_user, subject, content, photo_ids=None):
    """Envoie un message."""
    users = load_users()
    if to_user not in users:
        return False, "Destinataire non trouvé"

    # Convertir photo_ids en liste si c'est une string
    if isinstance(photo_ids, str) and photo_ids:
        photo_ids = [pid.strip() for pid in photo_ids.split(',') if pid.strip()]
    elif not photo_ids:
        photo_ids = []

    messages = load_messages()
    message = {
        'id': str(uuid.uuid4()),
        'from': from_user,
        'to': to_user,
        'subject': subject,
        'content': content,
        'photo_ids': photo_ids,
        'timestamp': datetime.now().isoformat(),
        'read': False
    }
    messages.append(message)
    save_messages(messages)
    return True, "Message envoyé"

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


def admin_required(f):
    """Décorateur pour protéger les routes admin - accès limité aux administrateurs."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_logged_in'):
            return redirect(url_for('user_login'))
        if session.get('username') not in ADMINS:
            # Retourner une erreur 404 - la page n'existe pas pour les non-admin
            from flask import abort
            abort(404)
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    track_visit()
    return render_template('index.html')

@app.route('/gallerie')
def gallery_page():
    """Page galerie publique avec filtrage par catégorie."""
    track_visit()
    return render_template('gallery.html')

@app.route('/apropos')
def perso():
    """Page personnelle."""
    return render_template('perso.html')


@app.route('/logout')
def logout():
    """Déconnexion admin."""
    session.pop('logged_in', None)
    return redirect(url_for('index'))

@app.route('/admin/stats')
@admin_required
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
            if category in p.get('categories', [])
        ])
    
    return render_template('admin_stats.html', stats=stats, categories=categories, gallery=gallery)

@app.route('/get-signature', methods=['GET'])
def get_signature():
    """Génère une signature Cloudinary pour l'upload direct depuis le navigateur."""
    if not CLOUDINARY_CONFIGURED:
        return jsonify({'error': 'Cloudinary non configuré'}), 500

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
    if not CLOUDINARY_CONFIGURED:
        return jsonify({'error': 'Cloudinary non configuré'}), 500

    try:
        data = request.json
        public_id = data.get('public_id')
        uploaded_at = data.get('created_at', '')
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
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
            'description': description,
            'title': title
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
@admin_required
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
@admin_required
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
@admin_required
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
        filtered_gallery = []
        for photo in gallery:
            # Support ancien format (category: string) et nouveau format (categories: list)
            photo_categories = []
            if photo.get('categories'):
                # Nouveau format : liste de catégories
                photo_categories = photo['categories'] if isinstance(photo['categories'], list) else [photo['categories']]
            elif photo.get('category'):
                # Ancien format : une seule catégorie
                photo_categories = [photo['category']]

            # Vérifier si la catégorie recherchée est dans les catégories de la photo
            if category in photo_categories:
                filtered_gallery.append(photo)

        gallery = filtered_gallery
    
    return jsonify(gallery)

@app.route('/categories')
def get_categories_api():
    """API pour récupérer toutes les catégories."""
    categories = get_categories()
    return jsonify(categories)

# Routes utilisateur
@app.route('/register', methods=['GET', 'POST'])
def register():
    """Page d'inscription utilisateur."""
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        confirm_password = request.form.get('confirm_password', '').strip()

        if not username or not password:
            return render_template('register.html', error='Tous les champs sont requis')

        if ' ' in username:
            return render_template('register.html', error='Le nom d\'utilisateur ne peut pas contenir d\'espaces')

        if password != confirm_password:
            return render_template('register.html', error='Les mots de passe ne correspondent pas')

        if len(password) < 6:
            return render_template('register.html', error='Le mot de passe doit faire au moins 6 caractères')

        success, message = create_user(username, password)
        if success:
            session['user_logged_in'] = True
            session['username'] = username
            return redirect(url_for('index'))
        else:
            return render_template('register.html', error=message)

    return render_template('register.html')

@app.route('/user/login', methods=['GET', 'POST'])
def user_login():
    """Page de connexion utilisateur."""
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()

        if not username or not password:
            return render_template('user_login.html', error='Tous les champs sont requis')

        success, user_data = authenticate_user(username, password)
        if success:
            session['user_logged_in'] = True
            session['username'] = username
            return redirect(url_for('index'))
        else:
            return render_template('user_login.html', error=user_data)

    return render_template('user_login.html')

@app.route('/user/logout')
def user_logout():
    """Déconnexion utilisateur."""
    session.pop('user_logged_in', None)
    session.pop('username', None)
    return redirect(url_for('index'))

# Routes messagerie
@app.route('/messages')
def messages():
    """Page de messagerie."""
    if not session.get('user_logged_in'):
        return redirect(url_for('user_login'))

    username = session['username']
    user_messages = get_user_messages(username)
    # Marquer les messages comme lus quand on ouvre la page
    messages_data = load_messages()
    for msg in messages_data:
        if msg['to'] == username and not msg.get('read', False):
            msg['read'] = True
    save_messages(messages_data)

    # Récupérer la liste des utilisateurs pour envoyer des messages
    users = load_users()
    other_users = [u for u in users.keys() if u != username]

    # Charger la galerie pour l'affichage des photos dans les messages
    gallery = load_gallery()

    return render_template('messages.html', messages=user_messages, users=other_users, gallery=gallery)

@app.route('/send-message', methods=['POST'])
def send_message_route():
    """Envoie un message."""
    if not session.get('user_logged_in'):
        return jsonify({'success': False, 'error': 'Non connecté'})

    from_user = session['username']
    to_user = request.form.get('to_user')
    subject = request.form.get('subject')
    content = request.form.get('content')
    photo_ids = request.form.get('photo_ids')

    if not to_user or not subject or not content:
        return jsonify({'success': False, 'error': 'Tous les champs sont requis'})

    success, message = send_message(from_user, to_user, subject, content, photo_ids)
    return jsonify({'success': success, 'message': message})

@app.route('/api/messages/unread')
def get_unread_messages():
    """API pour récupérer le nombre de messages non lus."""
    if not session.get('user_logged_in'):
        return jsonify({'unread': 0})

    username = session['username']
    unread_count = get_unread_count(username)
    return jsonify({'unread': unread_count})

@app.route('/api/messages/mark-read', methods=['POST'])
def mark_message_read():
    """API pour marquer un message comme lu."""
    if not session.get('user_logged_in'):
        return jsonify({'success': False, 'error': 'Non connecté'})

    username = session['username']
    message_id = request.json.get('message_id')

    if not message_id:
        return jsonify({'success': False, 'error': 'ID de message requis'})

    # Charger les messages et marquer comme lu
    messages = load_messages()
    for msg in messages:
        if str(msg.get('id')) == str(message_id) and msg['to'] == username:
            msg['read'] = True
            save_messages(messages)
            return jsonify({'success': True})

    return jsonify({'success': False, 'error': 'Message non trouvé'})

@app.route('/api/users')
def get_users():
    """API pour récupérer la liste des utilisateurs disponibles pour l'envoi de messages."""
    if not session.get('user_logged_in'):
        return jsonify({'users': []})

    current_username = session['username']
    users = load_users()

    # Pour les admins, retourner tous les utilisateurs sauf eux-mêmes
    if current_username in ADMINS:
        available_users = [u for u in users.keys() if u != current_username]
    else:
        # Pour les utilisateurs normaux, seulement les admins
        available_users = [admin for admin in ADMINS if admin in users and admin != current_username]

    return jsonify({'users': available_users})

@app.route('/rebuild-gallery', methods=['POST'])
def rebuild_gallery():
    """Reconstruit la galerie depuis toutes les images dans le dossier portfolio/ sur Cloudinary."""
    if not CLOUDINARY_CONFIGURED:
        return jsonify({'error': 'Cloudinary non configuré'}), 500

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
                'uploaded_at': resource.get('created_at', ''),
                'categories': ['Non catégorisé'], # Default category
                'description': '',
                'title': ''
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
if __name__ == '__main__':
    app.run(debug=True)
