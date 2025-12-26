// Index page-specific JavaScript

// Variables globales pour le slider
let sliderPhotos = [];
let currentSlideIndex = 0;
let sliderInterval = null;

// Fonctions globales pour les boutons du slider
function nextSlide() {
    currentSlideIndex = (currentSlideIndex + 1) % sliderPhotos.length;
    goToSlide(currentSlideIndex);
}

function prevSlide() {
    currentSlideIndex = (currentSlideIndex - 1 + sliderPhotos.length) % sliderPhotos.length;
    goToSlide(currentSlideIndex);
}

// Variables globales pour la photo actuelle
let currentPhoto = null;

document.addEventListener('DOMContentLoaded', function() {
    // Fermer le modal en cliquant en dehors
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('photoModal');
        if (e.target === modal) {
            closeModal();
        }
    });

    // Chargement initial
    loadGallery();
});

function initSlider() {
    const sliderImages = document.getElementById('sliderImages');
    const indicators = document.getElementById('sliderIndicators');

    sliderImages.innerHTML = '';
    indicators.innerHTML = '';

    if (sliderPhotos.length === 0) {
        sliderImages.innerHTML = '<div class="w-full flex items-center justify-center text-gray-500 bg-gray-200">Aucune photo disponible</div>';
        return;
    }

    // Créer les images du slider
    sliderPhotos.forEach((photo, index) => {
        const slide = document.createElement('div');
        slide.className = 'min-w-full h-full flex-shrink-0 cursor-pointer';
        slide.style.backgroundImage = `url(${photo.url})`;
        slide.style.backgroundSize = 'cover';
        slide.style.backgroundPosition = 'center';
        slide.onclick = () => openModal(photo);
        sliderImages.appendChild(slide);

        // Créer les indicateurs
        const indicator = document.createElement('button');
        indicator.className = `w-3 h-3 rounded-full transition ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}`;
        indicator.onclick = () => goToSlide(index);
        indicators.appendChild(indicator);
    });

    // Masquer les boutons s'il n'y a qu'une seule photo
    if (sliderPhotos.length <= 1) {
        document.getElementById('prevBtn').style.display = 'none';
        document.getElementById('nextBtn').style.display = 'none';
        indicators.style.display = 'none';
    }

    // Auto-play
    if (sliderInterval) clearInterval(sliderInterval);
    if (sliderPhotos.length > 1) {
        sliderInterval = setInterval(nextSlide, 5000);
    }
}

function goToSlide(index) {
    currentSlideIndex = index;
    const sliderImages = document.getElementById('sliderImages');
    sliderImages.style.transform = `translateX(-${index * 100}%)`;

    // Mettre à jour les indicateurs
    const indicators = document.querySelectorAll('#sliderIndicators button');
    indicators.forEach((ind, i) => {
        ind.className = `w-3 h-3 rounded-full transition ${i === index ? 'bg-blue-600' : 'bg-gray-300'}`;
    });
}

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

    const fullscreenDiv = document.createElement('div');
    fullscreenDiv.id = 'fullscreenContainer';
    fullscreenDiv.className = 'fixed inset-0 bg-black z-[9999] flex items-center justify-center';

    const img = document.createElement('img');
    img.src = currentPhoto.url;
    img.className = 'max-w-full max-h-full object-contain';
    img.alt = currentPhoto.title || 'Photo';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10';
    closeBtn.onclick = closeFullscreen;

    fullscreenDiv.appendChild(img);
    fullscreenDiv.appendChild(closeBtn);
    document.body.appendChild(fullscreenDiv);

    document.addEventListener('keydown', handleFullscreenKey);
}

function handleFullscreenKey(e) {
    if (e.key === 'Escape') {
        closeFullscreen();
    }
}

function closeFullscreen() {
    const container = document.getElementById('fullscreenContainer');
    if (container) {
        container.remove();
    }
    document.removeEventListener('keydown', handleFullscreenKey);
}

async function loadGallery() {
    const galleryDiv = document.getElementById('gallery');
    galleryDiv.innerHTML = '<div class="col-span-full text-center text-gray-500">Chargement...</div>';

    try {
        const response = await fetch('/gallery');
        const gallery = await response.json();

        // Charger les 6 dernières photos pour le slider
        sliderPhotos = gallery.slice(-6).reverse();
        initSlider();

        galleryDiv.innerHTML = '';
        if (!gallery.length) {
            galleryDiv.innerHTML = '<div class="col-span-full text-center text-gray-500 py-8">Aucune photo pour le moment.</div>';
            return;
        }

        gallery.slice(0, 4).forEach(photo => {
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
    } catch (error) {
        galleryDiv.innerHTML = '<div class="col-span-full text-center text-red-600 py-8">Impossible de charger la galerie.</div>';
    }
}
