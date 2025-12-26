// Admin page JavaScript

// Variables globales
let allPhotos = [];

// Fonction pour uploader une image directement vers Cloudinary
async function uploadImage() {
    const fileInput = document.getElementById('imageInput');
    const categoryInput = document.getElementById('categoryInput');
    const statusDiv = document.getElementById('status');

    if (!fileInput.files[0]) {
        statusDiv.textContent = 'Veuillez sélectionner une image.';
        statusDiv.className = 'text-sm text-red-600 mt-2';
        return;
    }

    try {
        statusDiv.textContent = 'Préparation de l\'upload...';
        statusDiv.className = 'text-sm text-blue-600 mt-2';

        // Obtenir la signature Cloudinary
        const signatureResponse = await fetch('/get-signature');
        if (!signatureResponse.ok) {
            throw new Error('Impossible d\'obtenir la signature Cloudinary');
        }

        const signatureData = await signatureResponse.json();

        // Préparer les données pour l'upload Cloudinary
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('api_key', signatureData.api_key);
        formData.append('timestamp', signatureData.timestamp);
        formData.append('signature', signatureData.signature);
        formData.append('folder', signatureData.folder);

        statusDiv.textContent = 'Upload vers Cloudinary...';

        // Upload vers Cloudinary
        const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${signatureData.cloud_name}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!cloudinaryResponse.ok) {
            throw new Error('Erreur lors de l\'upload vers Cloudinary');
        }

        const cloudinaryData = await cloudinaryResponse.json();

        statusDiv.textContent = 'Ajout à la galerie...';

        // Ajouter à la galerie locale
        const addResponse = await fetch('/add-photo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                public_id: cloudinaryData.public_id,
                created_at: cloudinaryData.created_at,
                category: categoryInput.value
            })
        });

        if (addResponse.ok) {
            statusDiv.textContent = 'Image ajoutée avec succès !';
            statusDiv.className = 'text-sm text-green-600 mt-2';
            fileInput.value = '';
            // Recharger la page pour voir la nouvelle image
            setTimeout(() => location.reload(), 1500);
        } else {
            const errorData = await addResponse.json();
            statusDiv.textContent = errorData.error || 'Erreur lors de l\'ajout à la galerie.';
            statusDiv.className = 'text-sm text-red-600 mt-2';
        }
    } catch (error) {
        console.error('Erreur upload:', error);
        statusDiv.textContent = 'Erreur lors de l\'upload: ' + error.message;
        statusDiv.className = 'text-sm text-red-600 mt-2';
    }
}

// Fonction pour créer une catégorie
async function createCategory() {
    const input = document.getElementById('newCategoryInput');
    const statusDiv = document.getElementById('categoryStatus');
    const categoryName = input.value.trim();

    if (!categoryName) {
        statusDiv.textContent = 'Veuillez entrer un nom de catégorie.';
        statusDiv.className = 'text-sm text-red-600 mt-2';
        return;
    }

    try {
        statusDiv.textContent = 'Création en cours...';
        statusDiv.className = 'text-sm text-blue-600 mt-2';

        const response = await fetch('/create-category', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: categoryName })
        });

        const result = await response.json();

        if (response.ok) {
            statusDiv.textContent = 'Catégorie créée avec succès !';
            statusDiv.className = 'text-sm text-green-600 mt-2';
            input.value = '';
            // Recharger les catégories
            loadCategories();
        } else {
            statusDiv.textContent = result.error || 'Erreur lors de la création.';
            statusDiv.className = 'text-sm text-red-600 mt-2';
        }
    } catch (error) {
        statusDiv.textContent = 'Erreur réseau.';
        statusDiv.className = 'text-sm text-red-600 mt-2';
    }
}

// Fonction pour mettre à jour une photo
async function updatePhoto(photoId) {
    const titleInput = document.getElementById(`title-${photoId}`);
    const categoriesInput = document.getElementById(`categories-${photoId}`);
    const descriptionInput = document.getElementById(`description-${photoId}`);

    const data = {
        title: titleInput.value.trim(),
        categories: categoriesInput.value.split(',').map(cat => cat.trim()).filter(cat => cat),
        description: descriptionInput.value.trim()
    };

    try {
        const response = await fetch(`/update-photo/${photoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            alert('Photo mise à jour avec succès !');
        } else {
            alert(result.error || 'Erreur lors de la mise à jour.');
        }
    } catch (error) {
        alert('Erreur réseau lors de la mise à jour.');
    }
}

// Fonction pour supprimer une photo
async function deletePhoto(photoId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
        return;
    }

    try {
        const response = await fetch(`/delete-photo/${photoId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            alert('Photo supprimée avec succès !');
            // Recharger la page
            location.reload();
        } else {
            alert(result.error || 'Erreur lors de la suppression.');
        }
    } catch (error) {
        alert('Erreur réseau lors de la suppression.');
    }
}

// Fonction pour charger les catégories
async function loadCategories() {
    try {
        const response = await fetch('/categories');
        const categories = await response.json();
        const select = document.getElementById('categoryInput');

        // Vider les options existantes sauf la première
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

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

// Fonction pour rechercher les photos
function searchPhotos() {
    const searchTerm = document.getElementById('searchPhotosInput').value.toLowerCase().trim();
    const photoItems = document.querySelectorAll('.photo-item');

    photoItems.forEach(item => {
        const title = item.dataset.photoTitle || '';
        // Si pas de terme de recherche, montrer tout
        // Sinon, vérifier si le titre contient le terme (insensible à la casse)
        const isVisible = !searchTerm || title.includes(searchTerm);
        item.style.display = isVisible ? 'block' : 'none';
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Charger les catégories au démarrage
    loadCategories();

    // Configurer la recherche
    const searchInput = document.getElementById('searchPhotosInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchPhotos);
    }
});