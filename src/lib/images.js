// Fotografía real de Unsplash (licencia Unsplash). Sustituibles por fotos propias
// del local: basta con cambiar estas URLs o la imagen de cada servicio en el panel.
const u = (id, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`

export const IMAGES = {
  hero: u('1503951914875-452162b0f3f1', 1400),
  tools: u('1621605815971-fbc98d665033', 2000),
  interior: u('1585747860715-2ba37e788b70', 1600),
  shave: u('1599351431202-1e0f0137899a', 1400),
  chair: u('1622286342621-4bd786c2447c', 1400),
}

export const SERVICE_FALLBACKS = [IMAGES.hero, IMAGES.shave, IMAGES.chair, IMAGES.interior]
