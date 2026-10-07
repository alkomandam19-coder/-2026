/**
 * Automatically compresses an image file/blob or Data URL and converts it to high-performance WebP format.
 * This drastically reduces file size (often 80-90% smaller) and improves page loading speed.
 */
export async function compressAndConvertToWebP(
  fileOrDataUrl: File | Blob | string,
  maxWidth = 1200,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve) => {
    try {
      let src = '';
      if (typeof fileOrDataUrl === 'string') {
        src = fileOrDataUrl;
      } else {
        src = URL.createObjectURL(fileOrDataUrl);
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          // Scale down if wider than maxWidth while preserving aspect ratio
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            if (typeof fileOrDataUrl !== 'string') URL.revokeObjectURL(src);
            resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : src);
            return;
          }

          // Render onto canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to WebP
          const webpDataUrl = canvas.toDataURL('image/webp', quality);
          if (typeof fileOrDataUrl !== 'string') URL.revokeObjectURL(src);

          if (webpDataUrl && webpDataUrl.startsWith('data:image/webp')) {
            resolve(webpDataUrl);
          } else {
            // Fallback to high efficiency JPEG
            resolve(canvas.toDataURL('image/jpeg', quality));
          }
        } catch (e) {
          if (typeof fileOrDataUrl !== 'string') URL.revokeObjectURL(src);
          resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : src);
        }
      };

      img.onerror = () => {
        if (typeof fileOrDataUrl !== 'string') URL.revokeObjectURL(src);
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : src);
      };

      img.src = src;
    } catch (err) {
      resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : (fileOrDataUrl ? URL.createObjectURL(fileOrDataUrl) : ''));
    }
  });
}

/**
 * Parses and returns appropriate media type & embed format for videos.
 * Supports YouTube links, Vimeo links, direct MP4/WebM video URLs, and base64 video data URLs.
 */
export function parseVideoMedia(urlStr: string): {
  isYouTube: boolean;
  embedUrl: string;
  isDirectVideo: boolean;
  rawUrl: string;
} {
  if (!urlStr) return { isYouTube: false, embedUrl: '', isDirectVideo: false, rawUrl: '' };

  const trimmed = urlStr.trim();

  // YouTube match (watch?v=, youtu.be/, shorts/)
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      isYouTube: true,
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`,
      isDirectVideo: false,
      rawUrl: trimmed,
    };
  }

  // Vimeo match
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      isYouTube: true,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      isDirectVideo: false,
      rawUrl: trimmed,
    };
  }

  // Direct video file or Data URL
  return {
    isYouTube: false,
    embedUrl: trimmed,
    isDirectVideo: true,
    rawUrl: trimmed,
  };
}
