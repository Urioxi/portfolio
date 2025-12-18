# Guide Gestion des Images

## Structure des données

Chaque photo dans le JSON (`data.json`) a cette structure :

```json
{
  "id": "uuid-unique",
  "public_id": "portfolio/abc123",
  "url": "https://res.cloudinary.com/...",
  "uploaded_at": "2025-12-17T10:00:00Z",
  "categories": ["Nature", "Voyage"],
  "title": "Mon titre",
  "description": "Ma description"
}
```

## Manipuler les images en JavaScript

### 1. Charger la galerie

```javascript
async function loadGallery() {
    const response = await fetch('/gallery');
    const gallery = await response.json();
    
    gallery.forEach(photo => {
        console.log(photo.id);        // ID unique
        console.log(photo.url);       // URL Cloudinary
        console.log(photo.title);     // Titre
        console.log(photo.description); // Description
        console.log(photo.categories); // Liste de catégories
    });
}
```

### 2. Créer un élément image

```javascript
function createImageElement(photo) {
    const img = document.createElement('img');
    img.src = photo.url;                    // URL de l'image
    img.alt = photo.title || 'Photo';       // Texte alternatif
    img.className = 'w-full h-64 object-cover'; // Classes Tailwind
    img.loading = 'lazy';                   // Chargement paresseux
    
    // Ajouter un ID unique basé sur l'ID de la photo
    img.id = `photo-${photo.id}`;
    
    return img;
}
```

### 3. Créer un slider (carrousel)

```javascript
let currentIndex = 0;
let photos = [];

async function initSlider() {
    // Charger les photos
    const response = await fetch('/gallery');
    photos = await response.json();
    
    if (photos.length === 0) return;
    
    // Afficher la première photo
    showPhoto(0);
}

function showPhoto(index) {
    if (index < 0) index = photos.length - 1;
    if (index >= photos.length) index = 0;
    
    currentIndex = index;
    const photo = photos[currentIndex];
    
    // Mettre à jour l'image
    const img = document.getElementById('slider-image');
    img.src = photo.url;
    img.alt = photo.title || 'Photo';
    
    // Mettre à jour le titre
    const title = document.getElementById('slider-title');
    title.textContent = photo.title || 'Sans titre';
    
    // Mettre à jour la description
    const desc = document.getElementById('slider-description');
    desc.textContent = photo.description || '';
    
    // Mettre à jour l'indicateur
    updateIndicator();
}

function nextPhoto() {
    showPhoto(currentIndex + 1);
}

function prevPhoto() {
    showPhoto(currentIndex - 1);
}

function updateIndicator() {
    const indicator = document.getElementById('slider-indicator');
    indicator.textContent = `${currentIndex + 1} / ${photos.length}`;
}

// Navigation au clavier
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevPhoto();
    if (e.key === 'ArrowRight') nextPhoto();
});
```

### 4. HTML pour le slider

```html
<div class="relative max-w-4xl mx-auto">
    <!-- Image -->
    <div class="relative">
        <img id="slider-image" src="" alt="Photo" class="w-full h-96 object-contain bg-gray-100 rounded-lg">
        
        <!-- Bouton précédent -->
        <button onclick="prevPhoto()" class="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75">
            ←
        </button>
        
        <!-- Bouton suivant -->
        <button onclick="nextPhoto()" class="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75">
            →
        </button>
    </div>
    
    <!-- Informations -->
    <div class="mt-4 text-center">
        <h3 id="slider-title" class="text-2xl font-bold mb-2"></h3>
        <p id="slider-description" class="text-gray-600"></p>
        <p id="slider-indicator" class="text-sm text-gray-500 mt-2"></p>
    </div>
    
    <!-- Miniatures -->
    <div class="flex gap-2 mt-4 overflow-x-auto">
        <div id="thumbnails" class="flex gap-2">
            <!-- Générées en JavaScript -->
        </div>
    </div>
</div>
```

### 5. Ajouter les miniatures

```javascript
function createThumbnails() {
    const container = document.getElementById('thumbnails');
    container.innerHTML = '';
    
    photos.forEach((photo, index) => {
        const thumb = document.createElement('img');
        thumb.src = photo.url;
        thumb.className = 'w-20 h-20 object-cover rounded cursor-pointer hover:opacity-75';
        thumb.onclick = () => showPhoto(index);
        
        // Mettre en évidence la photo active
        if (index === currentIndex) {
            thumb.className += ' border-2 border-blue-600';
        }
        
        container.appendChild(thumb);
    });
}
```

### 6. Filtrer par catégorie

```javascript
function filterByCategory(category) {
    const filtered = photos.filter(photo => 
        photo.categories && photo.categories.includes(category)
    );
    
    // Réinitialiser le slider avec les photos filtrées
    photos = filtered;
    showPhoto(0);
}
```

### 7. Rechercher par titre/description

```javascript
function searchPhotos(query) {
    const searchTerm = query.toLowerCase();
    const filtered = photos.filter(photo => 
        (photo.title && photo.title.toLowerCase().includes(searchTerm)) ||
        (photo.description && photo.description.toLowerCase().includes(searchTerm))
    );
    
    photos = filtered;
    showPhoto(0);
}
```

## Manipuler les IDs

### Utiliser l'ID pour identifier une photo

```javascript
// Trouver une photo par son ID
function findPhotoById(photoId) {
    return photos.find(photo => photo.id === photoId);
}

// Supprimer une photo par son ID
async function deletePhotoById(photoId) {
    const response = await fetch(`/delete-photo/${photoId}`, {
        method: 'DELETE'
    });
    return response.json();
}

// Mettre à jour une photo par son ID
async function updatePhotoById(photoId, data) {
    const response = await fetch(`/update-photo/${photoId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    return response.json();
}
```

### Créer des éléments avec ID unique

```javascript
function createPhotoCard(photo) {
    const card = document.createElement('div');
    card.id = `card-${photo.id}`;  // ID unique basé sur l'ID de la photo
    card.className = 'photo-card';
    
    const img = document.createElement('img');
    img.id = `img-${photo.id}`;    // ID unique pour l'image
    img.src = photo.url;
    
    card.appendChild(img);
    return card;
}
```

## Exemple complet : Slider fonctionnel

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <div id="slider-container" class="max-w-4xl mx-auto p-4">
        <!-- Le slider sera généré ici -->
    </div>
    
    <script>
        let photos = [];
        let currentIndex = 0;
        
        async function init() {
            const response = await fetch('/gallery');
            photos = await response.json();
            renderSlider();
        }
        
        function renderSlider() {
            const container = document.getElementById('slider-container');
            const photo = photos[currentIndex];
            
            container.innerHTML = `
                <div class="relative">
                    <img src="${photo.url}" alt="${photo.title}" class="w-full h-96 object-contain">
                    <button onclick="prevPhoto()" class="absolute left-4 top-1/2 bg-black bg-opacity-50 text-white p-2 rounded">←</button>
                    <button onclick="nextPhoto()" class="absolute right-4 top-1/2 bg-black bg-opacity-50 text-white p-2 rounded">→</button>
                </div>
                <h3 class="text-2xl font-bold mt-4">${photo.title || 'Sans titre'}</h3>
                <p class="text-gray-600 mt-2">${photo.description || ''}</p>
                <p class="text-sm text-gray-500 mt-2">${currentIndex + 1} / ${photos.length}</p>
            `;
        }
        
        function nextPhoto() {
            currentIndex = (currentIndex + 1) % photos.length;
            renderSlider();
        }
        
        function prevPhoto() {
            currentIndex = (currentIndex - 1 + photos.length) % photos.length;
            renderSlider();
        }
        
        init();
    </script>
</body>
</html>
```

## Bonnes pratiques

1. **Toujours utiliser l'ID unique** de la photo pour les opérations
2. **Stockage local** : garder la liste des photos en mémoire JavaScript
3. **Lazy loading** : utiliser `loading="lazy"` pour les images
4. **Gestion d'erreurs** : vérifier si l'image existe avant de l'afficher
5. **Performance** : limiter le nombre d'images affichées simultanément




