import { useLayoutEffect, useRef, useState } from 'react';

/**
 * A still map of where the school is — a snapshot, not a slippy map.
 *
 * There is no map library here and no API key. The map is a block of ordinary
 * <img> tiles laid out in a grid and shifted so the school's own coordinate
 * lands dead centre; the frame clips the rest. Nothing listens for a pointer,
 * so there is nothing to pan or zoom and nothing to accidentally scroll-trap a
 * phone inside.
 *
 * Why not the openstreetmap.org embed iframe, which is the other keyless
 * option: it brings OSM's own header bar, zoom buttons and "View Larger Map"
 * link with it, all of which would have to be neutralised with
 * `pointer-events: none` and would still be visible sitting on the page
 * looking like broken controls.
 *
 * ⚠️ Tiles come from OpenStreetMap's donated public servers. Their usage
 * policy asks anything heavy to move to its own tile server, and reserves the
 * right to block callers without notice — acceptable while this is small, and
 * a deliberate "make it properly reliable later" trade. TILE_URL below is the
 * entire migration surface: point it at a paid or self-hosted renderer and
 * nothing else on this page changes. Attribution is required by that same
 * policy, which is why the credit line is not optional decoration.
 */

const TILE_SIZE = 256;

// Street level — close enough to read the block the school sits on, wide
// enough that a slightly-off geocode still lands somewhere recognisable.
const ZOOM = 16;

const TILE_URL = (x, y, z) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

/**
 * Web Mercator: longitude is linear, latitude is not. Returns fractional tile
 * coordinates — the whole part picks the tile, the fraction is how far into it
 * the point sits, which is what lets the block be positioned to the pixel.
 */
function tileCoords(lat, lon, zoom) {
  const scale = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;

  return {
    x: ((lon + 180) / 360) * scale,
    y:
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      scale,
  };
}

function SchoolMap({ latitude, longitude, name }) {
  const frameRef = useRef(null);
  const [size, setSize] = useState(null);

  /**
   * The frame's real size decides how many tiles are needed, so it is measured
   * rather than assumed.
   *
   * An earlier version derived the block from FRAME_WIDTH/FRAME_HEIGHT
   * constants that had to be kept in step with App.css by hand. That is the
   * kind of invariant nobody remembers: the first version shipped a fixed 3×3
   * block against a full-width frame and left grey gutters that moved from
   * school to school, because how far off-centre the block sits depends on
   * where inside its own tile a given coordinate falls. Measuring deletes the
   * invariant — CSS is now the only place the size is decided, and the map
   * fills whatever it is given at any viewport.
   *
   * useLayoutEffect, not useEffect: it runs before the browser paints, so the
   * first frame the visitor sees already has its tiles rather than flashing an
   * empty box.
   */
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    const measure = () =>
      setSize({ width: frame.clientWidth, height: frame.clientHeight });

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const lat = Number(latitude);
  const lon = Number(longitude);

  // Same absence rule as MatchScore: a school the geocoder could not place
  // renders no map at all, rather than a pin in a plausible wrong spot.
  // Checked with isFinite rather than a null test so a malformed row cannot
  // reach the arithmetic below and produce NaN transforms.
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const centre = tileCoords(lat, lon, ZOOM);
  const pinX = centre.x * TILE_SIZE;
  const pinY = centre.y * TILE_SIZE;

  // The tiles the frame actually overlaps, and no others — derived from where
  // its edges land in world pixels, so the block covers exactly and overshoots
  // by at most one tile on each side.
  let tiles = [];
  let block = null;

  if (size && size.width > 0 && size.height > 0) {
    const firstCol = Math.floor((pinX - size.width / 2) / TILE_SIZE);
    const lastCol = Math.floor((pinX + size.width / 2) / TILE_SIZE);
    const firstRow = Math.floor((pinY - size.height / 2) / TILE_SIZE);
    const lastRow = Math.floor((pinY + size.height / 2) / TILE_SIZE);

    block = {
      width: (lastCol - firstCol + 1) * TILE_SIZE,
      height: (lastRow - firstRow + 1) * TILE_SIZE,
      // Where the school lands inside the block. The block is anchored at the
      // frame's centre in CSS and pulled back by this much, which puts the
      // coordinate itself under the pin.
      offsetX: pinX - firstCol * TILE_SIZE,
      offsetY: pinY - firstRow * TILE_SIZE,
    };

    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let col = firstCol; col <= lastCol; col += 1) {
        tiles.push({
          x: col,
          y: row,
          left: (col - firstCol) * TILE_SIZE,
          top: (row - firstRow) * TILE_SIZE,
        });
      }
    }
  }

  const osmLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;

  return (
    <div className="school-map">
      <div
        className="school-map-frame"
        ref={frameRef}
        role="img"
        aria-label={`Mapa okolí — ${name}`}
      >
        {block && (
          <div
            className="school-map-tiles"
            style={{
              width: block.width,
              height: block.height,
              transform: `translate(${-block.offsetX}px, ${-block.offsetY}px)`,
            }}
          >
            {tiles.map((tile) => (
              <img
                key={`${tile.x}/${tile.y}`}
                className="school-map-tile"
                src={TILE_URL(tile.x, tile.y, ZOOM)}
                alt=""
                width={TILE_SIZE}
                height={TILE_SIZE}
                loading="lazy"
                draggable="false"
                style={{ left: tile.left, top: tile.top }}
              />
            ))}
          </div>
        )}

        <span className="school-map-pin" aria-hidden="true">
          <svg viewBox="0 0 24 32" width="26" height="34" fill="none">
            <path
              d="M12 1c6.1 0 11 4.9 11 11 0 7.7-11 19-11 19S1 19.7 1 12C1 5.9 5.9 1 12 1Z"
              fill="var(--accent)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
            <circle cx="12" cy="12" r="4" fill="var(--surface)" />
          </svg>
        </span>

        <span className="school-map-credit">
          ©{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenStreetMap
          </a>
        </span>
      </div>

      <a
        className="school-map-open"
        href={osmLink}
        target="_blank"
        rel="noopener noreferrer"
      >
        Otevřít větší mapu →
      </a>
    </div>
  );
}

export default SchoolMap;
