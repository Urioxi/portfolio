// Messages page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Gestion du drag & drop pour les photos
    const dropZone = document.getElementById('photoDropZone');
    const fileInput = document.getElementById('photoFile');
    const selectedFileName = document.getElementById('selectedFileName');
    const photoIdsInput = document.getElementById('photo_ids');

    // Événements pour la zone de drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Style au survol
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropZone.classList.add('border-blue-500', 'bg-blue-50');
    dropZone.classList.remove('border-gray-300');
}

function unhighlight() {
    dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    dropZone.classList.add('border-gray-300');
}

// Gestion du drop
dropZone.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        handleFiles(files);
    }
}

// Gestion du clic pour sélectionner
dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
});

async function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image.');
        return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB max
        alert('Le fichier est trop volumineux (maximum 10MB).');
        return;
    }

    // Pour l'instant, on stocke juste le nom du fichier
    // Dans un vrai système, on uploaderait le fichier et récupérerait un ID
    const currentIds = photoIdsInput.value ? photoIdsInput.value.split(',') : [];
    currentIds.push(file.name);
    photoIdsInput.value = currentIds.join(',');

    updateSelectedFilesDisplay();
}

async function handleFiles(files) {
    const validFiles = [];
    for (let file of files) {
        if (!file.type.startsWith('image/')) {
            alert(`Le fichier ${file.name} n'est pas une image.`);
            continue;
        }
        if (file.size > 10 * 1024 * 1024) { // 10MB max
            alert(`Le fichier ${file.name} est trop volumineux (maximum 10MB).`);
            continue;
        }
        validFiles.push(file);
    }

    if (validFiles.length > 0) {
        const currentIds = photoIdsInput.value ? photoIdsInput.value.split(',') : [];
        validFiles.forEach(file => currentIds.push(file.name));
        photoIdsInput.value = currentIds.join(',');
        updateSelectedFilesDisplay();
    }
}

function updateSelectedFilesDisplay() {
    const ids = photoIdsInput.value.split(',').filter(id => id.trim());
    if (ids.length > 0) {
        selectedFileName.textContent = `${ids.length} fichier(s) sélectionné(s): ${ids.join(', ')}`;
        selectedFileName.classList.remove('hidden');
    } else {
        selectedFileName.classList.add('hidden');
    }
}

// Gestionnaire d'envoi de message
document.getElementById('messageForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    console.log('Tentative d\'envoi de message');

    // Validation supplémentaire pour s'assurer que to_user est défini
    let toUserValue = '';
    if (isAdmin) {
        toUserValue = document.getElementById('to_user').value;
        console.log('Admin - to_user:', toUserValue);
    } else {
        const selectElement = document.getElementById('userRecipientSelect');
        toUserValue = selectElement ? selectElement.value : '';
        console.log('User normal - to_user:', toUserValue, 'select element:', selectElement);
    }

    if (!toUserValue.trim()) {
        console.log('Validation échouée: pas de destinataire');
        const resultDiv = document.getElementById('messageResult');
        resultDiv.className = 'mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded';
        resultDiv.textContent = 'Veuillez sélectionner un destinataire';
        resultDiv.classList.remove('hidden');
        return;
    }

    const formData = new FormData(e.target);
    // S'assurer que to_user est dans le FormData
    formData.set('to_user', toUserValue);

    console.log('Envoi du message à:', toUserValue);

    const resultDiv = document.getElementById('messageResult');

    try {
        const response = await fetch('/send-message', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log('Réponse du serveur:', data);

        resultDiv.className = data.success ? 'mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded' : 'mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded';
        resultDiv.textContent = data.message;
        resultDiv.classList.remove('hidden');

        if (data.success) {
            e.target.reset();
            // Remettre à zéro les fichiers sélectionnés
            document.getElementById('photo_ids').value = '';
            document.getElementById('selectedFileName').classList.add('hidden');
            setTimeout(() => {
                location.reload();
            }, 2000);
        }
    } catch (error) {
        console.error('Erreur lors de l\'envoi:', error);
        resultDiv.className = 'mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded';
        resultDiv.textContent = 'Erreur lors de l\'envoi';
        resultDiv.classList.remove('hidden');
    }
});

// Variables pour stocker les messages
let allMessages = [];

// Fonction pour ouvrir un message
function openMessage(index) {
    // Récupérer les données des messages depuis le DOM
    const messagesData = document.getElementById('messages-data');
    const messages = JSON.parse(messagesData.dataset.messages);
    const message = messages[index];

    // Marquer le message comme lu si nécessaire
    if (!message.read) {
        markMessageAsRead(message.id);
    }

    // Remplir la modal
    document.getElementById('modalSubject').textContent = message.subject;
    document.getElementById('modalFrom').textContent = message.from;
    document.getElementById('modalTimestamp').textContent = `${message.timestamp.slice(0, 10)} à ${message.timestamp.slice(11, 16)}`;
    document.getElementById('modalContent').textContent = message.content;

    // Préparer le sujet de réponse
    const replySubject = message.subject.startsWith('Re: ') ? message.subject : `Re: ${message.subject}`;
    document.getElementById('replySubject').value = replySubject;
    document.getElementById('replyTo').value = message.from;
    document.getElementById('originalSubject').value = message.subject;

    // Afficher les photos si elles existent
    if (message.photo_ids && message.photo_ids.length > 0) {
        const photoContainer = document.getElementById('modalPhoto');
        const photoImg = document.getElementById('modalPhotoImg');
        const galleryData = document.getElementById('gallery-data');
        const gallery = JSON.parse(galleryData.dataset.gallery);

        // Trouver la première photo dans la galerie
        const firstPhotoId = message.photo_ids[0];
        const photo = gallery.find(p => p.id === firstPhotoId);

        if (photo && photo.url) {
            photoContainer.classList.remove('hidden');
            photoImg.src = photo.url;
            photoImg.alt = photo.title || `Photo ${firstPhotoId}`;

            // Si plusieurs photos, afficher un indicateur
            if (message.photo_ids.length > 1) {
                const indicator = document.createElement('div');
                indicator.className = 'mt-2 text-sm text-gray-500';
                indicator.textContent = `+ ${message.photo_ids.length - 1} autre(s) photo(s)`;
                photoContainer.appendChild(indicator);
            }
        } else {
            // Photo non trouvée, afficher un placeholder
            photoContainer.classList.remove('hidden');
            photoImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5QaG90byBub24gdHJvdXZlPC90ZXh0Pjwvc3ZnPg==';
            photoImg.alt = 'Photo non trouvée';
        }
    } else {
        document.getElementById('modalPhoto').classList.add('hidden');
    }

    // Afficher la modal
    document.getElementById('messageModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Fonction pour fermer la modal
function closeMessageModal() {
    document.getElementById('messageModal').classList.add('hidden');
    document.body.style.overflow = 'auto';

    // Réinitialiser le formulaire de réponse
    document.getElementById('replyForm').reset();
    document.getElementById('replySelectedFiles').classList.add('hidden');
    document.getElementById('replyResult').classList.add('hidden');
}

// Fonction pour marquer un message comme lu
async function markMessageAsRead(messageId) {
    try {
        await fetch('/api/messages/mark-read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message_id: messageId })
        });
    } catch (error) {
        console.error('Erreur lors du marquage du message comme lu:', error);
    }
}

// Liste des utilisateurs disponibles
let availableUsers = [];
let isAdmin = false;

// Charger la liste des utilisateurs et déterminer le statut admin
async function loadUsers() {
    try {
        // Utiliser les données de session définies dans base.html
        const sessionData = document.getElementById('session-data');
        const currentUsername = sessionData?.dataset?.currentUsername || '';

        console.log('Current username:', currentUsername); // Debug
        // Liste des administrateurs
        const admins = ['Urioxi', 'noemie.mrn21'];
        isAdmin = admins.includes(currentUsername);

        // Charger la liste des utilisateurs depuis l'API
        const response = await fetch('/api/users');
        const data = await response.json();
        availableUsers = data.users || [];

        // Adapter l'interface selon le statut
        setupRecipientInterface();
        setupUserSearch();
    } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
    }
}

// Configurer l'interface des destinataires selon le statut utilisateur
function setupRecipientInterface() {
    console.log('Configuration interface - isAdmin:', isAdmin, 'availableUsers:', availableUsers);
    const adminField = document.getElementById('adminRecipientField');
    const userField = document.getElementById('userRecipientField');

    if (isAdmin) {
        console.log('Affichage interface admin');
        adminField.classList.remove('hidden');
        userField.classList.add('hidden');
    } else {
        console.log('Affichage interface utilisateur normal');
        adminField.classList.add('hidden');
        userField.classList.remove('hidden');

        // Pour les utilisateurs normaux, créer une liste déroulante avec les admins disponibles
        const userSelect = document.getElementById('userRecipientSelect');
        console.log('userSelect element:', userSelect);
        if (userSelect && availableUsers.length > 0) {
            console.log('Remplissage de la liste déroulante avec:', availableUsers);
            userSelect.innerHTML = '<option value="">Choisir un destinataire...</option>';
            availableUsers.forEach(user => {
                const option = document.createElement('option');
                option.value = user;
                option.textContent = user;
                userSelect.appendChild(option);
            });
        } else {
            console.log('Pas de userSelect ou pas d\'utilisateurs disponibles');
        }
    }
}

// Gestionnaire de recherche d'utilisateurs (uniquement pour admin)
function setupUserSearch() {
    if (!isAdmin) return; // Ne rien faire si pas admin

    const searchInput = document.getElementById('to_user_search');
    const suggestionsDiv = document.getElementById('userSuggestions');
    const hiddenInput = document.getElementById('to_user');

    if (!searchInput || !suggestionsDiv || !hiddenInput) return;

    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        suggestionsDiv.innerHTML = '';

        if (query.length === 0) {
            suggestionsDiv.classList.add('hidden');
            hiddenInput.value = '';
            return;
        }

        const matches = availableUsers.filter(user =>
            user.toLowerCase().includes(query)
        ).slice(0, 5); // Limiter à 5 résultats

        if (matches.length > 0) {
            matches.forEach(user => {
                const div = document.createElement('div');
                div.className = 'px-3 py-2 hover:bg-gray-100 cursor-pointer';
                div.textContent = user;
                div.addEventListener('click', function() {
                    searchInput.value = user;
                    hiddenInput.value = user;
                    suggestionsDiv.classList.add('hidden');
                });
                suggestionsDiv.appendChild(div);
            });
            suggestionsDiv.classList.remove('hidden');
        } else {
            suggestionsDiv.classList.add('hidden');
        }
    });

    // Fermer les suggestions quand on clique ailleurs
    document.addEventListener('click', function(event) {
        if (!searchInput.contains(event.target) && !suggestionsDiv.contains(event.target)) {
            suggestionsDiv.classList.add('hidden');
        }
    });

    // Gestion de la touche Entrée
    searchInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const firstSuggestion = suggestionsDiv.querySelector('div');
            if (firstSuggestion) {
                firstSuggestion.click();
            }
        }
    });
}

// Charger les données au démarrage
loadUsers();

// Gestion du drag & drop pour la réponse
const replyDropZone = document.getElementById('replyPhotoDropZone');
const replyFileInput = document.getElementById('replyPhotoFile');
const replySelectedFiles = document.getElementById('replySelectedFiles');
const replyPhotoIdsInput = document.getElementById('replyPhotoIds');

// Événements pour la zone de drop de réponse
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    replyDropZone.addEventListener(eventName, preventDefaults, false);
});

// Style au survol pour la zone de réponse
['dragenter', 'dragover'].forEach(eventName => {
    replyDropZone.addEventListener(eventName, () => {
        replyDropZone.classList.add('border-blue-500', 'bg-blue-50');
        replyDropZone.classList.remove('border-gray-300');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    replyDropZone.addEventListener(eventName, () => {
        replyDropZone.classList.remove('border-blue-500', 'bg-blue-50');
        replyDropZone.classList.add('border-gray-300');
    }, false);
});

// Gestion du drop pour la réponse
replyDropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        handleReplyFiles(files);
    }
});

// Gestion du clic pour la réponse
replyDropZone.addEventListener('click', () => {
    replyFileInput.click();
});

replyFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleReplyFiles(e.target.files);
    }
});

function handleReplyFiles(files) {
    const validFiles = [];
    for (let file of files) {
        if (!file.type.startsWith('image/')) {
            alert(`Le fichier ${file.name} n'est pas une image.`);
            continue;
        }
        if (file.size > 10 * 1024 * 1024) { // 10MB max
            alert(`Le fichier ${file.name} est trop volumineux (maximum 10MB).`);
            continue;
        }
        validFiles.push(file);
    }

    if (validFiles.length > 0) {
        const currentIds = replyPhotoIdsInput.value ? replyPhotoIdsInput.value.split(',') : [];
        validFiles.forEach(file => currentIds.push(file.name));
        replyPhotoIdsInput.value = currentIds.join(',');
        updateReplySelectedFilesDisplay();
    }
}

function updateReplySelectedFilesDisplay() {
    const ids = replyPhotoIdsInput.value.split(',').filter(id => id.trim());
    if (ids.length > 0) {
        replySelectedFiles.textContent = `${ids.length} fichier(s) sélectionné(s): ${ids.join(', ')}`;
        replySelectedFiles.classList.remove('hidden');
    } else {
        replySelectedFiles.classList.add('hidden');
    }
}

// Gestionnaire d'envoi de réponse
document.getElementById('replyForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const resultDiv = document.getElementById('replyResult');

    try {
        const response = await fetch('/send-message', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        resultDiv.className = data.success ? 'mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded' : 'mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded';
        resultDiv.textContent = data.message;
        resultDiv.classList.remove('hidden');

        if (data.success) {
            e.target.reset();
            setTimeout(() => {
                closeMessageModal();
                location.reload();
            }, 2000);
        }
    } catch (error) {
        resultDiv.className = 'mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded';
        resultDiv.textContent = 'Erreur lors de l\'envoi';
        resultDiv.classList.remove('hidden');
    }
    });
});
