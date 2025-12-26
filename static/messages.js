// Messages page JavaScript

// Variables globales pour le drag & drop et l'état des utilisateurs
let availableUsers = [];
let isAdmin = false;

// Fonctions globales pour le drag & drop
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(dropZoneElement) {
    dropZoneElement.classList.add('border-blue-500', 'bg-blue-50');
    dropZoneElement.classList.remove('border-gray-300');
}

function unhighlight(dropZoneElement) {
    dropZoneElement.classList.remove('border-blue-500', 'bg-blue-50');
    dropZoneElement.classList.add('border-gray-300');
}

async function handleFile(file, photoIdsInput, selectedFileName) {
    if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image.');
        return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB max
        alert('Le fichier est trop volumineux (maximum 10MB).');
        return;
    }

    // Pour les messages, on stocke temporairement le nom du fichier
    // Le serveur devra gérer l'upload des fichiers attachés différemment
    const currentIds = photoIdsInput.value ? photoIdsInput.value.split(',') : [];
    currentIds.push(file.name);
    photoIdsInput.value = currentIds.join(',');

    updateSelectedFilesDisplay(photoIdsInput, selectedFileName);
}

async function handleFiles(files, photoIdsInput, selectedFileName) {
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
        updateSelectedFilesDisplay(photoIdsInput, selectedFileName);
    }
}

function updateSelectedFilesDisplay(photoIdsInput, selectedFileName) {
    const ids = photoIdsInput.value.split(',').filter(id => id.trim());
    if (ids.length > 0) {
        selectedFileName.textContent = `${ids.length} fichier(s) sélectionné(s): ${ids.join(', ')}`;
        selectedFileName.classList.remove('hidden');
    } else {
        selectedFileName.classList.add('hidden');
    }
}

// Fonctions globales pour la messagerie
function openMessage(messageId) {
    const messagesData = document.getElementById('messages-data');
    const messages = JSON.parse(messagesData.dataset.messages);

    const message = messages.find(msg => msg.id === messageId);
    if (!message) {
        console.error('Message not found with ID:', messageId);
        return;
    }

    if (!message.read) {
        markMessageAsRead(message.id);
    }

    document.getElementById('modalSubject').textContent = message.subject;
    document.getElementById('modalFrom').textContent = message.from;
    document.getElementById('modalTimestamp').textContent = `${message.timestamp.slice(0, 10)} à ${message.timestamp.slice(11, 16)}`;
    document.getElementById('modalContent').textContent = message.content;

    const replySubject = message.subject.startsWith('Re: ') ? message.subject : `Re: ${message.subject}`;
    document.getElementById('replySubject').value = replySubject;
    document.getElementById('replyTo').value = message.from;
    document.getElementById('originalSubject').value = message.subject;

    if (message.photo_ids && message.photo_ids.length > 0) {
        const photoContainer = document.getElementById('modalPhoto');
        const photoImg = document.getElementById('modalPhotoImg');
        const galleryData = document.getElementById('gallery-data');
        const gallery = JSON.parse(galleryData.dataset.gallery);

        const firstPhotoId = message.photo_ids[0];
        const photo = gallery.find(p => p.id === firstPhotoId);

        if (photo && photo.url) {
            photoContainer.classList.remove('hidden');
            photoImg.src = photo.url;
            photoImg.alt = photo.title || `Photo ${firstPhotoId}`;
            if (message.photo_ids.length > 1) {
                const indicator = document.createElement('div');
                indicator.className = 'mt-2 text-sm text-gray-500';
                indicator.textContent = `+ ${message.photo_ids.length - 1} autre(s) photo(s)`;
                photoContainer.appendChild(indicator);
            }
        } else {
            photoContainer.classList.remove('hidden');
            photoImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5QaG90byBub24gdHJvdXZlPC90ZXh0Pjwvc3ZnPg==';
            photoImg.alt = 'Photo non trouvée';
        }
    } else {
        document.getElementById('modalPhoto').classList.add('hidden');
    }

    document.getElementById('messageModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeMessageModal() {
    document.getElementById('messageModal').classList.add('hidden');
    document.body.style.overflow = 'auto';

    document.getElementById('replyForm').reset();
    document.getElementById('replySelectedFiles').classList.add('hidden');
    document.getElementById('replyResult').classList.add('hidden');
}

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

// Fonctions pour la gestion des utilisateurs (maintenues dans messages.js car spécifique à cette page)
async function loadUsers() {
    try {
        const sessionData = document.getElementById('session-data');
        const currentUsername = sessionData?.dataset?.currentUsername || '';

        const admins = ['Urioxi', 'noemie.mrn21'];
        isAdmin = admins.includes(currentUsername);

        const response = await fetch('/api/users');
        const data = await response.json();
        availableUsers = data.users || [];

        setupRecipientInterface();
        setupUserSearch();
    } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
    }
}

function setupRecipientInterface() {
    const adminField = document.getElementById('adminRecipientField');
    const userField = document.getElementById('userRecipientField');

    if (isAdmin) {
        if (adminField) adminField.classList.remove('hidden');
        if (userField) userField.classList.add('hidden');
    } else {
        if (adminField) adminField.classList.add('hidden');
        if (userField) userField.classList.remove('hidden');

        const userSelect = document.getElementById('userRecipientSelect');
        if (userSelect && availableUsers.length > 0) {
            userSelect.innerHTML = '<option value="">Choisir un destinataire...</option>';
            availableUsers.forEach(user => {
                const option = document.createElement('option');
                option.value = user;
                option.textContent = user;
                userSelect.appendChild(option);
            });
        }
    }
}

function setupUserSearch() {
    if (!isAdmin) return;

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

        // Vérifier si le texte tapé correspond exactement à un utilisateur
        const exactMatch = availableUsers.find(user => user.toLowerCase() === query);
        if (exactMatch) {
            hiddenInput.value = exactMatch;
        } else {
            hiddenInput.value = '';
        }

        const matches = availableUsers.filter(user =>
            user.toLowerCase().includes(query)
        ).slice(0, 5);

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

    document.addEventListener('click', function(event) {
        if (!searchInput.contains(event.target) && !suggestionsDiv.contains(event.target)) {
            suggestionsDiv.classList.add('hidden');
        }
    });

    searchInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const query = this.value.toLowerCase().trim();

            // Chercher un match exact d'abord
            const exactMatch = availableUsers.find(user => user.toLowerCase() === query);
            if (exactMatch) {
                searchInput.value = exactMatch;
                hiddenInput.value = exactMatch;
                suggestionsDiv.classList.add('hidden');
            } else {
                // Sinon utiliser la première suggestion
                const firstSuggestion = suggestionsDiv.querySelector('div');
                if (firstSuggestion) {
                    firstSuggestion.click();
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialisation des éléments de drag & drop pour l'envoi de nouveau message
    const dropZone = document.getElementById('photoDropZone');
    const fileInput = document.getElementById('photoFile');
    const selectedFileName = document.getElementById('selectedFileName');
    const photoIdsInput = document.getElementById('photo_ids');


    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => highlight(dropZone), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => unhighlight(dropZone), false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                handleFiles(files, photoIdsInput, selectedFileName);
            }
        }, false);

        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFiles(e.target.files, photoIdsInput, selectedFileName);
            }
        });
    }

    // Gestionnaire d'envoi de message
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        let toUserValue = '';
        if (isAdmin) {
            toUserValue = document.getElementById('to_user').value;
        } else {
            const selectElement = document.getElementById('userRecipientSelect');
            toUserValue = selectElement ? selectElement.value : '';
        }

        if (!toUserValue.trim()) {
            const resultDiv = document.getElementById('messageResult');
            resultDiv.className = 'mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded';
            resultDiv.textContent = 'Veuillez sélectionner un destinataire';
            resultDiv.classList.remove('hidden');
            console.log('Erreur: Aucun destinataire sélectionné');
            return;
        }

        const formData = new FormData(e.target);
        formData.set('to_user', toUserValue);

        const resultDiv = document.getElementById('messageResult');

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
                if (photoIdsInput) photoIdsInput.value = '';
                if (selectedFileName) selectedFileName.classList.add('hidden');
                setTimeout(() => {
                    location.reload();
                }, 2000);
            }
        } catch (error) {
            resultDiv.className = 'mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded';
            resultDiv.textContent = 'Erreur lors de l\'envoi';
            resultDiv.classList.remove('hidden');
        }
    });

    loadUsers();

    // Initialisation des éléments de drag & drop pour la réponse
    const replyDropZone = document.getElementById('replyPhotoDropZone');
    const replyFileInput = document.getElementById('replyPhotoFile');
    const replySelectedFiles = document.getElementById('replySelectedFiles');
    const replyPhotoIdsInput = document.getElementById('replyPhotoIds');

    if (replyDropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            replyDropZone.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            replyDropZone.addEventListener(eventName, () => highlight(replyDropZone), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            replyDropZone.addEventListener(eventName, () => unhighlight(replyDropZone), false);
        });

        replyDropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                handleFiles(files, replyPhotoIdsInput, replySelectedFiles);
            }
        });

        replyDropZone.addEventListener('click', () => {
            replyFileInput.click();
        });

        replyFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFiles(e.target.files, replyPhotoIdsInput, replySelectedFiles);
            }
        });
    }

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

    document.querySelectorAll('.message-item').forEach(item => {
        const messageId = item.dataset.messageId;
        item.addEventListener('click', function() {
            openMessage(messageId);
        });
    });

    // Fermer le modal en cliquant en dehors
    const messageModal = document.getElementById('messageModal');
    if (messageModal) {
        messageModal.addEventListener('click', (e) => {
            if (e.target === messageModal) {
                closeMessageModal();
            }
        });
    }
});