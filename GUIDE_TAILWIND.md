# Guide Tailwind CSS

## Qu'est-ce que Tailwind CSS ?

Tailwind CSS est un framework CSS qui utilise des **classes utilitaires** directement dans le HTML. Au lieu d'écrire du CSS custom, on utilise des classes prédéfinies.

## Comment ça marche ?

Tailwind est chargé via CDN dans `base.html` :
```html
<script src="https://cdn.tailwindcss.com"></script>
```

## Classes principales

### Couleurs de fond
```html
<div class="bg-white">      <!-- fond blanc -->
<div class="bg-blue-600">    <!-- fond bleu -->
<div class="bg-gray-100">    <!-- fond gris clair -->
<div class="bg-red-500">    <!-- fond rouge -->
```

### Espacement
```html
<div class="p-4">           <!-- padding de 4 unités (16px) -->
<div class="m-2">           <!-- margin de 2 unités (8px) -->
<div class="px-6 py-4">     <!-- padding horizontal 6, vertical 4 -->
<div class="mb-8">          <!-- margin-bottom de 8 -->
```

### Typographie
```html
<h1 class="text-3xl font-bold">     <!-- texte très grand et gras -->
<p class="text-gray-600">            <!-- texte gris -->
<span class="text-sm">              <!-- texte petit -->
<div class="font-semibold">          <!-- demi-gras -->
```

### Layout (Flexbox/Grid)
```html
<div class="flex">                  <!-- flexbox -->
<div class="flex items-center">     <!-- flexbox centré verticalement -->
<div class="grid grid-cols-3">      <!-- grille 3 colonnes -->
<div class="container mx-auto">     <!-- conteneur centré -->
```

### Bordures et ombres
```html
<div class="rounded-lg">            <!-- coins arrondis -->
<div class="border border-gray-300"> <!-- bordure grise -->
<div class="shadow-lg">             <!-- ombre portée -->
```

### Responsive Design
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```
- `grid-cols-1` : 1 colonne sur mobile
- `md:grid-cols-2` : 2 colonnes sur tablette (≥768px)
- `lg:grid-cols-3` : 3 colonnes sur desktop (≥1024px)

### États hover
```html
<button class="bg-blue-600 hover:bg-blue-700">
```
Change la couleur au survol.

### Positionnement
```html
<div class="relative">              <!-- position relative -->
<div class="absolute top-0">        <!-- position absolue -->
<div class="fixed inset-0">         <!-- fixe, plein écran -->
<div class="sticky top-0">          <!-- sticky en haut -->
```

### Visibilité
```html
<div class="hidden">                <!-- caché -->
<div class="flex">                  <!-- visible en flex -->
<div class="opacity-0">             <!-- transparent -->
<div class="opacity-100">           <!-- opaque -->
```

## Exemple complet

```html
<div class="bg-white rounded-xl shadow-lg p-6 mb-8">
    <h2 class="text-2xl font-semibold mb-4 text-gray-800">
        Titre
    </h2>
    <p class="text-gray-600 mb-4">
        Texte descriptif
    </p>
    <button class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition">
        Cliquer
    </button>
</div>
```

**Traduction :**
- Fond blanc, coins arrondis, ombre, padding 6, marge en bas 8
- Titre 2xl, demi-gras, marge en bas 4, texte gris foncé
- Texte gris, marge en bas 4
- Bouton bleu, devient bleu foncé au survol, texte blanc, gras, padding vertical 2 horizontal 4, coins arrondis, transition

## Ressources

- Documentation officielle : https://tailwindcss.com/docs
- Cheat sheet : https://nerdcave.com/tailwind-cheat-sheet




