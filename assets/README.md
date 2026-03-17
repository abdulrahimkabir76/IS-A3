# assets/

Place any static images, icons, or media files in this directory.

## Suggested assets to add

| File | Purpose |
|---|---|
| `favicon.ico` | Browser tab icon |
| `og-image.png` | Open Graph preview image (1200×630 px) |
| `profile-placeholder.jpg` | Hero avatar image (optional — currently using emoji) |

To use a real avatar photo, place the image here and update `index.html`:

```html
<!-- Replace the emoji span with: -->
<img
  class="hero__avatar"
  src="assets/profile-placeholder.jpg"
  alt="Alex Chen profile photo"
  width="310"
  height="310"
/>
```
