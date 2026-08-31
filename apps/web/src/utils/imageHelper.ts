/**
 * Utility to compress and convert an uploaded file into an optimized Base64 string.
 * This keeps the output extremely compact (50KB-120KB) so that it can be stored
 * directly in Firestore without performance issues or document size bottlenecks.
 */
export function compressAndConvertImage(file: File, maxWidth = 600, maxHeight = 900, quality = 0.92): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions keeping aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Fill background white for JPEGs (in case of empty transparency)
          ctx.beginPath();
          ctx.rect(0, 0, width, height);
          ctx.fillStyle = "#16161a"; // Dark background to blend with our F1 dark theme
          ctx.fill();

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => {
        reject(new Error("Error al cargar la imagen para compresión."));
      };
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
}
