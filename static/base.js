// Base JavaScript for all pages

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    if (userMenuBtn && userMenu) {
        userMenuBtn.addEventListener('click', function() {
            userMenu.classList.toggle('hidden');
        });
    }

    // Close menus when clicking outside
    document.addEventListener('click', function(event) {
        if (userMenuBtn && userMenu && !userMenuBtn.contains(event.target) && !userMenu.contains(event.target)) {
            userMenu.classList.add('hidden');
        }

        if (mobileMenuBtn && mobileMenu && !mobileMenuBtn.contains(event.target) && !mobileMenu.contains(event.target)) {
            mobileMenu.classList.add('hidden');
        }
    });

    // Update unread message count
    updateUnreadCount();

    // Update unread count every 30 seconds
    setInterval(updateUnreadCount, 30000);
});

async function updateUnreadCount() {
    const sessionData = document.getElementById('session-data');
    if (!sessionData || sessionData.dataset.userLoggedIn !== 'true') {
        return;
    }

    try {
        const response = await fetch('/api/messages/unread');
        const data = await response.json();

        const badges = [
            document.getElementById('unreadBadge'),
            document.getElementById('menuUnreadBadge'),
            document.getElementById('mobileUnreadBadge')
        ];

        badges.forEach(badge => {
            if (badge) {
                if (data.unread > 0) {
                    badge.textContent = data.unread > 99 ? '99+' : data.unread;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du nombre de messages non lus:', error);
    }
}