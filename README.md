# kieranriley.com

Personal website for Kieran Riley, freelance full-stack software developer.

It's plain HTML, CSS and a little vanilla JavaScript, served by GitHub Pages as-is. There's no build step and no `npm install`: edit a file, push, and it's live.

## How it works

The whole site is one screen, the **board**:
- a full-width header with the logo and the light/dark toggle
- the sunset photo as a tall centre tile with the headline
- tiles of different sizes either side of it

Clicking a tile opens a detail panel that grows out of it. Each panel has its own link (`/#ai`, `/#new`, `/#modernise`, `/#advice`, `/#about`, `/#approach`, `/#contact`). Opening About, the tile's photo flies into the panel, and the back button and Esc both close it.

On first load, an **opening sequence** plays:
1. the sunset photo fades in full screen
2. it shrinks into the centre tile
3. the tiles rise in around it

It's skipped when the visitor prefers reduced motion or arrives on a panel link, and any click or key skips it too.

**Light and dark mode** follow the visitor's device setting. The round button in the header lets them switch, and their choice is remembered on that device.

## Files

| Path                     | What it is                                                                 |
| ------------------------ | -------------------------------------------------------------------------- |
| `index.html`             | The site: the board, and the detail panels below it                        |
| `assets/css/site.css`    | All styles. Colour tokens for light and dark mode are at the top.          |
| `assets/js/site.js`      | Opening and closing panels, tile tilt, and the light/dark toggle            |
| `assets/js/intro.js`     | The opening sequence                                                       |
| `assets/fonts/`          | Inter, self-hosted                                                         |
| `assets/img/`            | Resized WebP/JPEG photos                                                   |
| `media/`                 | Original photos                                                            |
| `work-with-me.html`      | Redirects old `/work-with-me` links to the homepage                        |
| `404.html`               | Page not found                                                             |
| `og-image.jpg`           | Image shown when the site is shared (1200×630)                             |
| `sitemap.xml`, `robots.txt`, `CNAME` | SEO files and the custom domain                              |

## Editing content

All copy lives in `index.html`:
- tiles are the `<article class="tile">` elements inside `#board`
- panels are the `<section class="detail">` elements inside `#details`

To add a tile that opens a panel, give its heading link `href="#your-id" data-open`, and add a `<section class="detail" id="your-id">`.

Without JavaScript, the panels simply appear as sections below the board.

## Colours

Mostly white and near-black with a quiet blue accent, roughly a 60/30/10 split. In dark mode the white tiles become charcoal, and the "Get in touch" tile flips from black to white so it still stands out.

## Previewing locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000/.
