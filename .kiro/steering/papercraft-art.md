---
inclusion: fileMatch
fileMatchPattern: ["src/render/**/*.ts", "styles.css", "index.html"]
---

# Papercraft art direction

Applies when editing rendering code or UI styling.

- Draw only with Canvas code. No `Image`, `<img>`, CSS `url()` textures or data-URI pictures for scenery, characters or UI.
- Each paper piece needs a cut edge, visible thickness, a contact shadow and correct overlap. Noise laid over a flat shape is not enough.
- Trees, houses, road, grass, cats, enemies and UI share one material language.
- Houses need volume in walls and roof faces; tree crowns need grouped leaf clusters; ground details come in clusters, not evenly scattered.
- Cold night tones should set off warm lamp and window light. Cats, ink blobs and danger must stay readable.
- Keep the Meow Wall face identifiers for Zero and Nicole (`src/cats/`).
- Fix shape design before adding more decoration. Uniform noise, plain geometric blocks and more props do not replace good shapes.
- Judge changes from real running screenshots (`npm run build`, `npm start`, `/?start=1`). Static screenshots only; no animation or recording checks for now.
- Do not report the art as approved; only the user can accept it.
