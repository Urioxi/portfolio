document.addEventListener('DOMContentLoaded', function() {
    const uploadBtn = document.getElementById('uploadBtn');
    const photoInput = document.getElementById('photoInput');
    const uploadBox = document.getElementById('uploadBox');
    const previewContainer = document.getElementById('previewContainer');
    const message = document.getElementById('message');
    const gallery = document.getElementById('gallery');

    // Gestion du clic sur le bouton d'upload
    uploadBtn.addEventListener('click', () => {
        console.log("Bouton upload cliqué");
        photoInput.click();
    });

    // Gestion de la sélection de fichier
    photoInput.addEventListener('change', (e) => {
        console.log("Fichier sélectionné:", e.target.files[0]);
        if (e.target.files.length) {
            handleFileUpload(e.target.files[0]);
        }
    });

    function handleFileUpload(file) {
        console.log("Traitement du fichier:", file.name);
        
        // Vérifier si c'est une image
        if (!file.type.startsWith('image/')) {
            showMessage('Veuillez sélectionner une image valide (PNG, JPG, JPEG, GIF)', 'error');
            return;
        }

        // Vérifier la taille (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showMessage('L\'image est trop grande (max 10MB)', 'error');
            return;
        }

        // Prévisualisation
        const reader = new FileReader();
        reader.onload = function(e) {
            previewContainer.innerHTML = `
                <img src="${e.target.result}" alt="Prévisualisation" 
                     style="max-width: 300px; max-height: 300px; border-radius: 5px;">
                <p>Prévisualisation - ${file.name}</p>
                <button id="confirmUpload" class="btn-confirm">
                    Confirmer l'upload
                </button>
                <button id="cancelUpload" class="btn-cancel">
                    Annuler
                </button>
            `;
            
            // Ajouter les événements pour les boutons
            document.getElementById('confirmUpload').addEventListener('click', () => {
                uploadToServer(file);
            });
            
            document.getElementById('cancelUpload').addEventListener('click', () => {
                previewContainer.innerHTML = '';
                photoInput.value = '';
            });
        };
        reader.readAsDataURL(file);
    }

    function uploadToServer(file) {
        console.log("Upload vers le serveur...");
        const formData = new FormData();
        formData.append('photo', file);

        showMessage('Upload en cours...', 'info');

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log("Réponse reçue, status:", response.status);
            return response.json();
        })
        .then(data => {
            console.log("Données reçues:", data);
            if (data.success) {
                showMessage('✓ Photo ajoutée avec succès !', 'success');
                addPhotoToGallery(data.photo);
                // Réinitialiser après 3 secondes
                setTimeout(() => {
                    previewContainer.innerHTML = '';
                    photoInput.value = '';
                    message.style.display = 'none';
                }, 3000);
            } else {
                showMessage('✗ Erreur: ' + data.error, 'error');
                previewContainer.innerHTML = '';
            }
        })
        .catch(error => {
            console.error('Erreur fetch:', error);
            showMessage('✗ Erreur de connexion au serveur', 'error');
            previewContainer.innerHTML = '';
        });
    }

    function showMessage(text, type) {
        message.textContent = text;
        message.className = `message ${type}`;
        message.style.display = 'block';
    }

    function addPhotoToGallery(photo) {
        const photoCard = document.createElement('div');
        photoCard.className = 'photo-card';
        
        // Formater la date
        const date = new Date(photo.created_at).toLocaleDateString('fr-FR');
        
        photoCard.innerHTML = `
            <img src="${photo.url}" alt="Nouvelle photo" loading="lazy">
            <div class="photo-info">
                <span>Format: ${photo.format}</span>
                <small>${date}</small>
            </div>
        `;
        
        // Ajouter au début de la galerie
        gallery.prepend(photoCard);
    }
});