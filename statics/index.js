// Index page-specific JavaScript
let currentPhoto = null;
let sliderPhotos = [];
let currentSlideIndex = 0;
let sliderInterval = null;

function initSlider() {
    const sliderImages = document.getElementById('sliderImages');
    const indicators = document.getElementById('sliderIndicators');

    sliderImages.innerHTML = '';
    indicators.innerHTML = '';

    if (sliderPhotos.length === 0) {
        sliderImages.innerHTML = '<div class="w-full flex items-center justify-center text-gray-500">Aucune photo disponible</div>';
        return;
    }

    // Créer les images du slider
    sliderPhotos.forEach((photo, index) => {
        const slide = document.createElement('div');
        slide.className = 'min-w-full h-full flex-shrink-0';
        slide.style.backgroundImage = `url(${photo.url})`;
        slide.style.backgroundSize = 'cover';
        slide.style.backgroundPosition = 'center';
        slide.onclick = () => openModal(photo);
        slide.className += ' cursor-pointer';
        sliderImages.appendChild(slide);

        // Créer les indicateurs
        const indicator = document.createElement('button');
        indicator.className = `w-3 h-3 rounded-full transition ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}`;
        indicator.onclick = () => goToSlide(index);
        indicators.appendChild(indicator);
    });

    // Auto-play toutes les 5 secondes
    if (sliderInterval) clearInterval(sliderInterval);
    sliderInterval = setInterval(nextSlide, 5000);
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

    // Réinitialiser l'auto-play
    if (sliderInterval) clearInterval(sliderInterval);
    sliderInterval = setInterval(nextSlide, 5000);
}

function nextSlide() {
    currentSlideIndex = (currentSlideIndex + 1) % sliderPhotos.length;
    goToSlide(currentSlideIndex);
}

function prevSlide() {
    currentSlideIndex = (currentSlideIndex - 1 + sliderPhotos.length) % sliderPhotos.length;
    goToSlide(currentSlideIndex);
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

function closeModal() {
    const modal = document.getElementById('photoModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = 'auto';
}

async function loadGallery() {
    const galleryDiv = document.getElementById('gallery');
    galleryDiv.innerHTML = '<div class="col-span-full text-center text-gray-500">Chargement...</div>';

    try {
        const response = await fetch('/gallery');
        const gallery = await response.json();

        // Charger les 6 dernières photos pour le slider
        sliderPhotos = gallery.slice(-6).reverse(); // Les plus récentes en premier
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

// Fermer le modal en cliquant en dehors
document.addEventListener('click', (e) => {
    const modal = document.getElementById('photoModal');
    if (e.target === modal) {
        closeModal();
    }
});

// Chargement initial
loadGallery();
