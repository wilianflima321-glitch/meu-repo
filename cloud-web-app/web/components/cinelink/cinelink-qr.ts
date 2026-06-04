export function generateCineLinkQRCode(data: string, size: number = 200): string {
  const modules = 25;
  const moduleSize = size / modules;
  const hash = data.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const finderPositions = [[0, 0], [0, modules - 7], [modules - 7, 0]];

  let paths = '';

  for (const [x, y] of finderPositions) {
    paths += `<rect x="${x * moduleSize}" y="${y * moduleSize}" width="${7 * moduleSize}" height="${7 * moduleSize}" fill="black"/>`;
    paths += `<rect x="${(x + 1) * moduleSize}" y="${(y + 1) * moduleSize}" width="${5 * moduleSize}" height="${5 * moduleSize}" fill="white"/>`;
    paths += `<rect x="${(x + 2) * moduleSize}" y="${(y + 2) * moduleSize}" width="${3 * moduleSize}" height="${3 * moduleSize}" fill="black"/>`;
  }

  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      const inFinderPattern =
        (row < 8 && col < 8) ||
        (row < 8 && col >= modules - 8) ||
        (row >= modules - 8 && col < 8);

      if (inFinderPattern) continue;
      if (((hash + row * col + row + col) % 3) === 0) {
        paths += `<rect x="${col * moduleSize}" y="${row * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
      }
    }
  }

  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="white"/>
    ${paths}
  </svg>`;
}
