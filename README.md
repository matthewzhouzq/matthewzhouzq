# Matthew Zhou — a desk, after hours

A 3D portfolio built entirely in code: React Three Fiber, drei and postprocessing. There are no Blender models.

```bash
npm install
npm run dev      # local dev
npm run deploy   # build + push to gh-pages
```

## Where things live

| What | File |
|---|---|
| **All content** (projects, contacts, timeline, interests) | `src/data.js` |
| Object positions on the desk + camera shots | `src/store.js` (`LAYOUT`, `SHOTS`) |
| Scene, lights, post-processing | `src/scene/Scene.jsx` |
| Each object | `src/scene/{Desk,Chair,Lamp,Candles,Laptop,Phone,Resume,Clock,Plant,Room}.jsx` |
| Hover lift / outline / label / click | `src/scene/Interactive.jsx` |
| Overlays that open on click | `src/ui/*View.jsx` |
| Styles + palette | `src/index.css` |

## Swapping in a real model later

Download a `.glb` file (Poly Pizza, Kenney, Sketchfab, Meshy…), run `npx gltfjsx model.glb --transform`,
then drop the generated component inside the matching `<Interactive>` in `Scene.jsx`.

The résumé texture is page 1 of `public/matthewzhou_cv.pdf`. After you update the PDF, regenerate it with:
`pdftoppm -png -r 110 -f 1 -l 1 public/matthewzhou_cv.pdf public/resume-page && mv public/resume-page-1.png public/resume-page.png`
