# CSS Inventering - Keep Projekt

**Datum**: 2026-01-22
**Status**: Innan städning

## Sammanfattning

| Metrik | Värde |
|--------|-------|
| **Antal CSS-filer** | 1 (styles.css) |
| **Totalt antal rader** | 1134 |
| **Antal !important** | 1 |
| **Inline styles i HTML** | ~60 instanser |
| **CSS-variabler** | 0 |
| **Modularisering** | Nej (monolitisk fil) |

## Nuvarande struktur

### CSS-filer
- `/public/styles.css` - 1134 rader, väl organiserad med 16 sektioner

### Huvudsektioner i styles.css

1. **Universal selector** (rad 1-11) - Reset
2. **body** (rad 13-19) - Global styling
3. **AUTH SCREEN** (rad 21-138) - Login/Register
4. **HEADER** (rad 140-181) - Top navigation
5. **BUTTONS** (rad 183-243) - Button variants
6. **MAIN CONTENT** (rad 245-250) - Content container
7. **NEW NOTE FORM** (rad 252-296) - Note creation
8. **COLOR PICKER** (rad 298-339) - Color selector
9. **CHECKLIST** (rad 341-376) - Checklist items
10. **NOTES GRID** (rad 378-574) - Note cards layout
11. **MODAL** (rad 576-675) - Modal dialogs
12. **IMPORT MODAL** (rad 677-716) - Import UI
13. **PROFILE PICTURES** (rad 718-786) - Avatar styles
14. **AVATAR COLOR PICKER** (rad 788-807) - Avatar colors
15. **SHARE UI** (rad 809-952) - Sharing functionality
16. **NOTE IMAGES** (rad 954-1097) - Image handling
17. **RESPONSIVE** (rad 1099-1131) - Mobile styles

## Kritiska selektorer

### Layout
```css
.notes-grid              /* rad 378 - CSS Grid layout */
main                     /* rad 245 - Max-width container */
header                   /* rad 140 - Sticky header */
```

### Komponenter
```css
.note-card               /* rad 385 - Huvudkomponent för notes */
.note-card:hover         /* rad 412 - Hover effekt */
.note-card::before       /* rad 413 - Checkmark vid hover */
.note-card::after        /* rad 432 - Fade-out gradient */
```

### Modaler
```css
.modal                   /* rad 576 - Overlay */
.modal.active            /* rad 582 - Show state */
.modal-content           /* rad 587 - Modal box */
```

## Problem identifierade

### 1. !important användning
**Antal**: 1
**Plats**: rad 1026
```css
.note-card .note-images:has(img:only-child) img {
  height: 200px !important;
}
```
**Anledning**: Tvingar höjd på ensam bild
**Lösning**: Öka specificity utan !important

### 2. Inline styles i HTML

#### Display toggles (~30 instanser)
```html
style="display: none;"
```
**Påverkar**:
- #auth-screen, #app
- .auth-form (login/register)
- #checklist-container
- #images-container
- Modaler

**Lösning**: Skapa `.hidden` utility class

#### Färg på färgväljare-knappar (12 instanser)
```html
<button class="color-btn" style="background: #ffffff"></button>
<button class="color-btn" style="background: #f28b82"></button>
<!-- ...10 fler -->
```
**Lösning**: Använd data-attribut + CSS

#### Layout styling (~15 instanser)
```html
style="display: flex; gap: 8px; flex-direction: column;"
style="text-align: center; margin: 20px 0;"
style="grid-template-columns: repeat(5, 1fr);"
```
**Lösning**: Skapa utility classes eller komponent-klasser

#### Modal max-width (3 instanser)
```html
style="max-width: 600px;"
style="max-width: 400px;"
style="max-width: 500px;"
```
**Lösning**: Skapa modifier classes (`.modal-content--large`, etc.)

### 3. Hårdkodade färger

Färger som upprepas ofta (bör bli CSS-variabler):

| Färg | Användning | Antal |
|------|------------|-------|
| `#1a73e8` | Primary blue (buttons, links) | 15+ |
| `#667eea` | Purple accent | 8+ |
| `#5f6368` | Text muted | 12+ |
| `#e0e0e0` | Borders | 20+ |
| `#f1f3f4` | Background subtle | 10+ |
| `#ffffff` | White | 30+ |
| `#000000` | Black | 15+ |

### 4. Duplikationer

#### Avatar klasser (lätt reducerbar)
```css
.profile-pic-header  /* 36x36 */
.profile-pic-large   /* 120x120 */
.profile-pic-small   /* 32x32 */
.profile-initials-small /* 32x32 med initialer */
```
Alla har identisk struktur förutom storlek → kan förenklas med modifiers

## Positiva aspekter

### ✅ Väl organiserad
- Tydliga sektionsrubriker med CAPS
- Logisk gruppering av relaterad CSS
- Enkel att navigera

### ✅ Modern CSS
```css
/* GPU acceleration */
will-change: transform, box-shadow;
transform: translateZ(0);
backface-visibility: hidden;

/* Flexbox & Grid */
display: grid;
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));

/* CSS :has() selector */
.note-images:has(img:only-child)
```

### ✅ God naming convention
- Mestadels BEM-liknande
- Beskrivande klassnamn
- Minimal nesting

### ✅ Inga stora specificity-problem
- Inga långa selector-chains
- Inga ID-selectors för styling
- Endast 1 !important

## Rekommendationer för städning

### Prioritet 1 (Hög impact, låg risk)
1. Skapa CSS-variabler för färger
2. Skapa `.hidden` utility class
3. Eliminera inline display styles

### Prioritet 2 (Medel impact, medel risk)
1. Dela upp i separata filer (base, layout, components, etc.)
2. Eliminera !important
3. Flytta inline färgstyling till CSS

### Prioritet 3 (Låg impact, högre risk)
1. Skapa BEM-struktur för note-card
2. Konsolidera avatar-klasser
3. Skapa debug.css system

## Målbild efter städning

```
/public/css/
  ├── base.css          (~100 rader) - Reset, variabler, typografi
  ├── layout.css        (~50 rader)  - Grid, containers, main
  ├── components.css    (~400 rader) - Note cards, buttons, forms
  ├── modals.css        (~150 rader) - Modaler
  ├── utilities.css     (~50 rader)  - Helper classes
  └── debug.css         (~50 rader)  - Debug styling

Total: ~800 rader (reducering från 1134)
Inline styles: 0 (reducering från ~60)
!important: 0 (reducering från 1)
CSS-variabler: 20+ (ökning från 0)
```

## Nästa steg
Se [Fas 2](#) för att börja dela upp CSS i filer.
