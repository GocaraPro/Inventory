# Card metadata

`card-metadata.json` is a generated English metadata snapshot from [TCGdex cards-database](https://github.com/tcgdex/cards-database) and [TCGdex's English card index](https://api.tcgdex.net/v2/en/cards).

Only explicit numeric Cardmarket product IDs are used. Conflicting IDs that point at multiple TCGdex cards are omitted. Names alone are never used to assign an image or a number. Set names are mapped by explicit expansion IDs. Source files are parsed as TypeScript literals; upstream code is not executed. Card image URLs come from the TCGdex index and use its documented `/high.webp` format.

The metadata dataset license is retained in `TCGDEX-LICENSE`. Pokémon artwork remains the property of its respective rights holders. Images are loaded from the source CDN, not redistributed in this repository.

Refresh with `npm run metadata:refresh` (Node.js, installed project dependencies, and Python 3.9+). Commit the generated snapshot after reviewing the mapping count. Runtime requests do not depend on GitHub or thousands of TCGdex API calls. Unmapped products retain their original Cardmarket name and a fallback illustration.
