// Gallery-specific JavaScript
document.addEventListener('DOMContentLoaded', function() {
    let allPhotos = [];
    let currentPhoto = null;

    function openModal(photo) {
    currentPhoto = photo;
    const modal = document.getElementById('photoModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalText = document.getElementById('modalText');

    modalImage.src = photo.url;
    modalTitle.textContent = photo.title || 'Sans titre';
    modalText.textContent = photo.description || 'Aucune description disponible.';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('photoModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = 'auto';
}

function openFullscreen() {
    if (!currentPhoto) return;

    // Créer un élément pour le plein écran
    const fullscreenDiv = document.createElement('div');
    fullscreenDiv.id = 'fullscreenContainer';
    fullscreenDiv.className = 'fixed inset-0 bg-black z-[9999] flex items-center justify-center';
    fullscreenDiv.style.display = 'flex';

    const img = document.createElement('img');
    img.src = currentPhoto.url;
    img.className = 'max-w-full max-h-full object-contain';
    img.alt = currentPhoto.title || 'Photo';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center';
    closeBtn.onclick = closeFullscreen;

    fullscreenDiv.appendChild(img);
    fullscreenDiv.appendChild(closeBtn);
    document.body.appendChild(fullscreenDiv);

    // Activer le plein écran natif
    if (fullscreenDiv.requestFullscreen) {
        fullscreenDiv.requestFullscreen();
    } else if (fullscreenDiv.webkitRequestFullscreen) {
        fullscreenDiv.webkitRequestFullscreen();
    } else if (fullscreenDiv.msRequestFullscreen) {
        fullscreenDiv.msRequestFullscreen();
    }

    // Fermer avec Échap
    document.addEventListener('keydown', handleFullscreenKey);
}

function handleFullscreenKey(e) {
    if (e.key === 'Escape') {
        closeFullscreen();
    }
}

function closeFullscreen() {
    // Sortir du plein écran natif
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }

    // Supprimer l'élément
    const container = document.getElementById('fullscreenContainer');
    if (container) {
        container.remove();
    }

    document.removeEventListener('keydown', handleFullscreenKey);
}

async function loadCategories() {
    try {
        const response = await fetch('/categories');
        const categories = await response.json();
        const select = document.getElementById('categoryFilter');

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erreur chargement catégories:', error);
    }
}

async function loadGallery(category = '') {
    const galleryDiv = document.getElementById('gallery');
    galleryDiv.innerHTML = '<div class="col-span-full text-center text-gray-500 py-8">Chargement...</div>';

    try {
        const url = category ? `/gallery?category=${encodeURIComponent(category)}` : '/gallery';
        const response = await fetch(url);
        const gallery = await response.json();

        allPhotos = gallery;
        displayGallery(gallery);
    } catch (error) {
        galleryDiv.innerHTML = '<div class="col-span-full text-center text-red-600 py-8">Impossible de charger la galerie.</div>';
    }
}

function displayGallery(gallery) {
    const galleryDiv = document.getElementById('gallery');
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // Filtrer par terme de recherche
    let filteredGallery = gallery;
    if (searchTerm) {
        filteredGallery = gallery.filter(photo => {
            const title = (photo.title || '').toLowerCase();
            return title.includes(searchTerm);
        });
    }

    galleryDiv.innerHTML = '';

    if (!filteredGallery.length) {
        const message = searchTerm
            ? 'Aucune photo trouvée avec ce titre.'
            : 'Aucune photo dans cette catégorie.';
        galleryDiv.innerHTML = `<div class="col-span-full text-center text-gray-500 py-8">${message}</div>`;
        return;
    }

    filteredGallery.forEach(photo => {
        const div = document.createElement('div');
        div.className = 'relative group overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer';
        div.onclick = () => openModal(photo);

        const img = document.createElement('img');
        img.src = photo.url;
        img.className = 'w-full h-64 object-cover';
        img.alt = 'Photo portfolio';
        img.loading = 'lazy';

        div.appendChild(img);
        galleryDiv.appendChild(div);
    });
}

// Event listener pour le filtre de catégorie
document.getElementById('categoryFilter').addEventListener('change', (e) => {
    loadGallery(e.target.value);
});

// Event listener pour la recherche
document.getElementById('searchInput').addEventListener('input', (e) => {
    displayGallery(allPhotos);
});

// Fermer le modal en cliquant en dehors
document.addEventListener('click', (e) => {
    const modal = document.getElementById('photoModal');
    if (e.target === modal) {
        closeModal();
    }
});

// Chargement initial
    loadCategories();
    loadGallery();
});
