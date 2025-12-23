// Admin-specific JavaScript
async function createCategory() {
    const input = document.getElementById('newCategoryInput');
    const status = document.getElementById('categoryStatus');
    const name = input.value.trim();

    if (!name) {
        status.textContent = 'Entrez un nom de catégorie';
        status.className = 'text-sm text-red-600 mt-2';
        return;
    }

    try {
        const response = await fetch('/create-category', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: name})
        });

        const result = await response.json();
        if (result.success) {
            status.textContent = '✅ Catégorie créée ! Vous pouvez maintenant l\'utiliser.';
            status.className = 'text-sm text-green-600 mt-2';
            input.value = '';
            setTimeout(() => window.location.reload(), 1000);
        } else {
            status.textContent = '❌ Erreur: ' + result.error;
            status.className = 'text-sm text-red-600 mt-2';
        }
    } catch (error) {
        status.textContent = '❌ Erreur: ' + error.message;
        status.className = 'text-sm text-red-600 mt-2';
    }
}

async function updatePhoto(photoId) {
    const titleInput = document.getElementById(`title-${photoId}`);
    const categoriesInput = document.getElementById(`categories-${photoId}`);
    const descriptionInput = document.getElementById(`description-${photoId}`);

    const categories = categoriesInput.value.split(',').map(c => c.trim()).filter(c => c);

    try {
        const response = await fetch(`/update-photo/${photoId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                title: titleInput.value,
                categories: categories,
                description: descriptionInput.value
            })
        });

        const result = await response.json();
        if (result.success) {
            alert('✅ Photo mise à jour avec succès !');
            window.location.reload();
        } else {
            alert('❌ Erreur: ' + result.error);
        }
    } catch (error) {
        alert('❌ Erreur: ' + error.message);
    }
}

async function deletePhoto(photoId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
        return;
    }

    try {
        const response = await fetch(`/delete-photo/${photoId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (result.success) {
            alert('✅ Photo supprimée !');
            window.location.reload();
        } else {
            alert('❌ Erreur: ' + result.error);
        }
    } catch (error) {
        alert('❌ Erreur: ' + error.message);
    }
}

// Fonction de recherche dans la liste des photos
function searchPhotos() {
    const searchInput = document.getElementById('searchPhotosInput');
    const searchTerm = searchInput.value.toLowerCase().trim();
    const photoItems = document.querySelectorAll('.photo-item');

    photoItems.forEach(item => {
        const title = item.getAttribute('data-photo-title') || '';
        if (title.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });

    // Afficher un message si aucun résultat
    const visibleItems = Array.from(photoItems).filter(item => item.style.display !== 'none');
    const photosList = document.getElementById('photosList');
    let noResultsMsg = document.getElementById('noResultsMsg');

    if (visibleItems.length === 0 && searchTerm) {
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.id = 'noResultsMsg';
            noResultsMsg.className = 'text-center text-gray-500 py-8 col-span-full';
            noResultsMsg.textContent = 'Aucune photo trouvée avec ce titre.';
            photosList.appendChild(noResultsMsg);
        }
    } else {
        if (noResultsMsg) {
            noResultsMsg.remove();
        }
    }
}

// Event listener pour la recherche dans admin
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchPhotosInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchPhotos);
    }
});

async function uploadImage() {
    const fileInput = document.getElementById('imageInput');
    const categoryInput = document.getElementById('categoryInput');
    const status = document.getElementById('status');
    const btn = document.getElementById('uploadBtn');
    const file = fileInput.files[0];

    if (!file) {
        status.textContent = 'Sélectionne une image avant d\'envoyer.';
        status.className = 'text-sm text-red-600 mt-2';
        return;
    }

    status.textContent = '⏳ Envoi en cours...';
    status.className = 'text-sm text-blue-600 mt-2';
    btn.disabled = true;

    try {
        // 1. Obtenir la signature depuis le serveur
        const sigResponse = await fetch('/get-signature');
        const sigData = await sigResponse.json();

        if (!sigResponse.ok) {
            throw new Error(sigData.error || 'Erreur lors de la génération de la signature');
        }

        // 2. Upload direct vers Cloudinary depuis le navigateur
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', file);
        cloudinaryFormData.append('api_key', sigData.api_key);
        cloudinaryFormData.append('timestamp', sigData.timestamp);
        cloudinaryFormData.append('signature', sigData.signature);
        cloudinaryFormData.append('folder', sigData.folder);

        const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${sigData.cloud_name}/image/upload`,
            {
                method: 'POST',
                body: cloudinaryFormData
            }
        );

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
            throw new Error(uploadResult.error?.message || 'Erreur lors de l\'upload vers Cloudinary');
        }

        // 3. Enregistrer la photo dans la galerie
        const addResponse = await fetch('/add-photo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                public_id: uploadResult.public_id,
                created_at: uploadResult.created_at,
                category: categoryInput.value  // Le backend convertira en categories
            })
        });

        const addResult = await addResponse.json();

        if (addResult.success) {
            status.textContent = '✅ Photo uploadée avec succès !';
            status.className = 'text-sm text-green-600 mt-2';
            fileInput.value = '';
            categoryInput.value = 'Non catégorisé';
            // Recharger la page pour mettre à jour les stats
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            status.textContent = '❌ Erreur: ' + addResult.error;
            status.className = 'text-sm text-red-600 mt-2';
        }
    } catch (error) {
        status.textContent = '❌ Erreur: ' + error.message;
        status.className = 'text-sm text-red-600 mt-2';
        console.error('Erreur upload:', error);
    } finally {
        btn.disabled = false;
    }
}
