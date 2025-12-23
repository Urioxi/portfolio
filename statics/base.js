document.addEventListener('DOMContentLoaded', function() {
    // Menu mobile
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    // Menu utilisateur
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');

    // Gestion du menu utilisateur
    if (userMenuBtn && userMenu) {
        userMenuBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            // Fermer d'abord tous les menus
            if (mobileMenu) mobileMenu.classList.add('hidden');

            // Basculer le menu utilisateur
            const isHidden = userMenu.classList.contains('hidden');
            if (isHidden) {
                userMenu.classList.remove('hidden');
            } else {
                userMenu.classList.add('hidden');
            }
        });
    }

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function(event) {
            event.stopPropagation(); // Empêcher la propagation de l'événement
            // Fermer d'abord le menu utilisateur
            if (userMenu) userMenu.classList.add('hidden');

            // Basculer le menu mobile
            const isHidden = mobileMenu.classList.contains('hidden');
            if (isHidden) {
                mobileMenu.classList.remove('hidden');
            } else {
                mobileMenu.classList.add('hidden');
            }
        });

        // Fermer le menu quand on clique sur un lien
        const menuLinks = mobileMenu.querySelectorAll('a');
        menuLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenu.classList.add('hidden');
            });
        });

        // Fermer les menus utilisateur quand on clique sur un lien
        if (userMenu) {
            const userMenuLinks = userMenu.querySelectorAll('a');
            userMenuLinks.forEach(link => {
                link.addEventListener('click', function() {
                    userMenu.classList.add('hidden');
                });
            });
        }
    }

    // Fermer les menus quand on clique en dehors
    document.addEventListener('click', function(event) {
        // Fermer menu mobile
        if (mobileMenuBtn && mobileMenu) {
            if (!mobileMenu.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
                mobileMenu.classList.add('hidden');
            }
        }
        // Fermer menu utilisateur
        if (userMenuBtn && userMenu) {
            if (!userMenu.contains(event.target) && !userMenuBtn.contains(event.target)) {
                userMenu.classList.add('hidden');
            }
        }
    });

    // Gestion des messages non lus
    const userLoggedIn = document.getElementById('session-data').dataset.userLoggedIn === 'true';

    if (userLoggedIn) {
        async function updateUnreadBadge() {
            try {
                const response = await fetch('/api/messages/unread');
                const data = await response.json();

                const desktopBadge = document.getElementById('unreadBadge');
                const mobileBadge = document.getElementById('mobileUnreadBadge');

        const menuBadge = document.getElementById('menuUnreadBadge');
        if (desktopBadge && mobileBadge && data.unread > 0) {
            const count = data.unread > 99 ? '99+' : data.unread.toString();
            desktopBadge.textContent = count;
            mobileBadge.textContent = count;
            if (menuBadge) {
                menuBadge.textContent = count;
                menuBadge.classList.remove('hidden');
            }
            desktopBadge.classList.remove('hidden');
            mobileBadge.classList.remove('hidden');
        } else if (desktopBadge && mobileBadge) {
            desktopBadge.classList.add('hidden');
            mobileBadge.classList.add('hidden');
            if (menuBadge) {
                menuBadge.classList.add('hidden');
            }
        }
            } catch (error) {
                console.error('Erreur lors de la mise à jour des badges:', error);
            }
        }

        // Mettre à jour les badges au chargement de la page
        updateUnreadBadge();

        // Mettre à jour les badges toutes les 30 secondes
        setInterval(updateUnreadBadge, 30000);
    }
});
