// Réduction d'une photo dans le navigateur avant l'envoi (espace créatrice) : 2 400 px au plus, JPEG qualité 0,85.
// Le nouvel encodage retire les métadonnées de la photo d'origine (position GPS, appareil) et reste sous la limite
// d'envoi de Vercel. Le serveur revérifie le type réel et la taille.
export const MAX_SIDE = 2400;

export async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Photo illisible.'))), 'image/jpeg', 0.85));
}
