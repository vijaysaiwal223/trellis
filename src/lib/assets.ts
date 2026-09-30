/** Resolve a Figma-exported SVG icon under `public/assets/figma/icons`. */
export const iconPath = (name: string) => `/assets/figma/icons/${name}.svg`;

/** Resolve a Figma-exported asset (logos, avatars) under `public/assets/figma`. */
export const assetPath = (name: string) => `/assets/figma/${name}`;
