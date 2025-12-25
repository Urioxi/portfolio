import urllib.request
import time

print('Attente de 3 secondes pour que le JS s\'execute...')
time.sleep(3)

try:
    response = urllib.request.urlopen('http://127.0.0.1:5000/')
    html = response.read().decode('utf-8')

    # Chercher l'element gallery
    start = html.find('<div id="gallery"')
    if start != -1:
        end = html.find('</div>', start) + 6
        gallery_content = html[start:end]
        print('Contenu de gallery trouve')

        img_count = gallery_content.count('<img')
        print(f'Nombre d\'images: {img_count}')

        if 'Chargement' in gallery_content:
            print('Toujours en chargement...')
        elif img_count > 0:
            print('SUCCESS: Photos affichees!')
        else:
            print('ERREUR: Aucune photo visible')
    else:
        print('ERREUR: Element gallery non trouve')

except Exception as e:
    print(f'Erreur: {e}')
