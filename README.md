# kieranriley.com

Personal website for Kieran Riley, freelance full-stack software developer.

Plain HTML, CSS and a little vanilla JavaScript, served by GitHub Pages. There's no build step, framework or `npm install`. Edit a file, push, and it's live.

## Files

| Path                      | What it is                                                         |
| ------------------------- | ------------------------------------------------------------------ |
| `index.html`              | About page (`/`)                                                   |
| `work-with-me.html`       | Work With Me page (`/work-with-me`)                                |
| `404.html`                | Page not found                                                     |
| `variations.html`         | Hero design options to compare. Not linked or indexed; delete once chosen. |
| `assets/css/styles.css`   | All styles. Colours are variables at the top.                      |
| `assets/js/main.js`       | Page-load and scroll animations, header behaviour, photo parallax  |
| `assets/js/stream.js`     | The animated "code stream" used in the dark hero variations        |
| `assets/fonts/`           | Inter, self-hosted                                                 |
| `assets/img/`             | Resized WebP/JPEG versions of the photos                           |
| `media/`                  | Original photos                                                    |
| `og-image.jpg`            | Image shown when the site is shared on social media (1200×630)     |
| `sitemap.xml`, `robots.txt`, `CNAME` | SEO files and the custom domain for GitHub Pages        |

## Colours

The palette follows a 60/30/10 split:

- 60%: white and a soft grey (`--white`, `--paper`)
- 30%: near-black for text and dark sections (`--ink`, `--black`)
- 10%: a quiet blue for small accents only, such as links, the dot in the logo, focus rings and button hovers (`--blue`)

## Animations

- headlines slide up line by line on load
- the hero photo opens out and slowly zooms as you scroll
- sections fade up as they scroll into view
- the header hides when you scroll down and comes back when you scroll up
- pages cross-fade between each other in browsers that support it

All of it switches off for visitors who've asked their device for reduced motion. If the JavaScript fails to load, everything still appears after a moment.

## Contact

There's no contact form. Visitors are pointed to LinkedIn, so there's nothing to spam, no form service to pay for, and no personal data stored by the site.

## Updating photos

Photos are pre-sized so pages load quickly. To add or replace one, export it at a couple of widths (around 800px and 1400px is plenty) as `.webp`, plus a `.jpg` fallback, put them in `assets/img/`, and update the `srcset` in the HTML.

## Previewing locally

Any static file server works, for example:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000/. Clean URLs like `/work-with-me` work on GitHub Pages; locally you may need `/work-with-me.html`.
