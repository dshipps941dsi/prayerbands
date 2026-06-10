# Product images (store carousel)

Drop up to 3 images per product here. The store card cycles through them as a
slider; until a file exists it gracefully shows the band illustration instead.

Expected filenames (referenced in `app/store/page.tsx` → `PRODUCT_IMAGES`):

- `standard-1.jpg`, `standard-2.jpg`, `standard-3.jpg`  → Standard Band
- `custom-1.jpg`, `custom-2.jpg`, `custom-3.jpg`        → Custom Band

Guidance:
- Square-ish images look best (cards crop to a 200px-tall band, object-fit: cover).
- ~1000×1000, under ~250 KB each (JPG or WebP).
- To add more products or change filenames, edit `PRODUCT_IMAGES` in
  `app/store/page.tsx`.
