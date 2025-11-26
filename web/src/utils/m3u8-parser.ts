/**
 * M3U8 Playlist Parser Utility
 *
 * Parses HLS master playlists to extract available quality variants
 */

export interface PlaylistVariant {
  url: string;
  bandwidth: number;
  resolution?: string;
  width?: number;
  height?: number;
  label: string;
  res?: number; // For VideoJS compatibility
}

interface M3U8ParseResult {
  variants: PlaylistVariant[];
  error?: string;
}

/**
 * Parses an M3U8 master playlist and extracts variant information
 * @param masterUrl - URL to the master.m3u8 file
 * @returns Promise with parsed variants or error
 */
export async function parseMasterPlaylist(masterUrl: string): Promise<M3U8ParseResult> {
  try {
    const response = await fetch(masterUrl);

    if (!response.ok) {
      return {
        variants: [],
        error: `Failed to fetch master playlist: ${response.status} ${response.statusText}`
      };
    }

    const content = await response.text();
    const variants = parseM3U8Content(content, masterUrl);

    return { variants };
  } catch (error) {
    console.error('[M3U8Parser] Error fetching/parsing master playlist:', error);
    return {
      variants: [],
      error: error instanceof Error ? error.message : 'Unknown error parsing playlist'
    };
  }
}

/**
 * Parses M3U8 content and extracts variant streams
 * @param content - M3U8 file content
 * @param baseUrl - Base URL for resolving relative paths
 * @returns Array of playlist variants
 */
function parseM3U8Content(content: string, baseUrl: string): PlaylistVariant[] {
  const lines = content.split('\n').map(line => line.trim());
  const variants: PlaylistVariant[] = [];
  const baseUrlPath = baseUrl.substring(0, baseUrl.lastIndexOf('/'));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for #EXT-X-STREAM-INF lines (variant playlists)
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      const attributes = parseAttributes(line);
      const nextLine = lines[i + 1];

      if (nextLine && !nextLine.startsWith('#')) {
        // Resolve relative URLs
        const variantUrl = nextLine.startsWith('http')
          ? nextLine
          : `${baseUrlPath}/${nextLine}`;

        const bandwidth = parseInt(attributes.BANDWIDTH || '0');
        const resolution = attributes.RESOLUTION;
        let width: number | undefined;
        let height: number | undefined;
        let label = 'Auto';
        let res: number | undefined;

        // Parse resolution if available
        if (resolution) {
          const [w, h] = resolution.split('x').map(n => parseInt(n));
          width = w;
          height = h;

          // Create label based on height (e.g., "1080p", "720p")
          if (height) {
            label = `${height}p`;
            res = height;
          }
        }

        // If no resolution but we have bandwidth, try to estimate quality
        if (!label || label === 'Auto') {
          if (bandwidth >= 5000000) label = '1080p';
          else if (bandwidth >= 2500000) label = '720p';
          else if (bandwidth >= 1000000) label = '480p';
          else if (bandwidth >= 500000) label = '360p';
          else label = 'Low';
        }

        variants.push({
          url: variantUrl,
          bandwidth,
          resolution,
          width,
          height,
          label,
          res
        });
      }
    }
  }

  // Sort by bandwidth (highest first)
  variants.sort((a, b) => b.bandwidth - a.bandwidth);

  return variants;
}

/**
 * Parses M3U8 attributes from a tag line
 * Example: #EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720
 */
function parseAttributes(line: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributePart = line.split(':')[1];

  if (!attributePart) return attributes;

  // Split by comma, but be careful with quoted values
  const parts = attributePart.match(/(?:[^\s,"]|"(?:\\.|[^"])*")+/g) || [];

  for (const part of parts) {
    const [key, ...valueParts] = part.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=');
      // Remove quotes if present
      value = value.replace(/^"(.*)"$/, '$1');
      attributes[key.trim()] = value.trim();
    }
  }

  return attributes;
}

/**
 * Converts parsed variants to VideoJS source format
 * @param variants - Parsed playlist variants
 * @param masterUrl - Original master playlist URL
 * @param options - Additional source options (e.g., for live DVR)
 */
export function variantsToVideoJSSources(
  variants: PlaylistVariant[],
  masterUrl: string,
  options: { allowSeeksWithinUnsafeLiveWindow?: boolean } = {}
) {
  const sources = [];

  // Add master playlist as "Auto" quality
  sources.push({
    src: masterUrl,
    type: 'application/x-mpegURL',
    label: 'Auto',
    ...options
  });

  // Add individual quality variants
  for (const variant of variants) {
    sources.push({
      src: variant.url,
      type: 'application/x-mpegURL',
      label: variant.label,
      res: variant.res,
      ...options
    });
  }

  return sources;
}

