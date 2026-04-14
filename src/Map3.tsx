import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Map.css';

import { MOCK_REGIONS, type RegionData } from './ttt';
import { getTextWidth } from './utils/textMeasure';
import { ZoomControls } from './components/ZoomControls';
import { getPathLookup } from 'svg-getpointatlength';

// --- Constants ---
const MAP_WIDTH = 1280;
const MAP_HEIGHT = 720;
const INITIAL_VIEW_BOX = { x: 0, y: 50, width: 1220, height: 750 };
const SCALE_FACTOR = 0.1;
const MIN_SCALE = 0.2;
const MAX_SCALE = 1;
const FONT_SIZE = 20;
const HH_API_URL = 'https://api.hh.ru/vacancies';

// --- Types ---
interface PointerData {
  width: number;
  height: number;
  pos: { x: number; y: number };
  text: string;
  textSize: number;
  textLength: number;
  radius: number;
  offsetY: number;
}

interface RegionWithPointer extends RegionData {
  pointer: PointerData | null;
}

interface TooltipPosition {
  x: number;
  y: number;
}

interface HhApiResponse {
  found: number;
  items: unknown[];
}


// --- Utility Functions ---
function calculatePointerData(
  region: RegionData,
  scale: number,
  fontSize: number = FONT_SIZE
): PointerData | null {
  if (!region.total) return null;
  const { path, total } = region


  // Создаём временный path элемент для получения BBox
  const lookup = getPathLookup(path)
  const { x, y, width, height } = lookup.getBBox()


  const scaledFont = Math.floor(fontSize * scale)
  const text = String(total);
  const textLength = getTextWidth(text, {size: scaledFont});

  const pointPadding = scaledFont * 0.5;
  const pointMargin = 5
  const radius = textLength * 0.5 + pointPadding;
  const diameter = radius * 2;

  const halfHeight = height * .5
  const halfWidth = width * .5

  const pointerInRegion = height > diameter + pointMargin && width > diameter + pointMargin;
  const offsetY = pointerInRegion ? 0 : halfHeight + radius
  const pos = {
      x: x + halfWidth,
      y: y + halfHeight - offsetY,
  }

  return {
    width: diameter,
    height: diameter,
    pos,
    text,
    textSize: scaledFont,
    textLength,
    radius,
    offsetY,
  };
}

async function fetchVacancies(regionName: string, signal: AbortSignal): Promise<number> {
  //  const response = await fetch(
  // `${HH_API_URL}?text=${encodeURIComponent(regionName)}`,
  //    { signal }
  // );

  if (!response.ok) {
    throw new Error(`HH API error: ${response.status}`);
  }

  //const data: HhApiResponse = await response.json();
  return 1000//data.found;
}

// --- Sub-components ---
interface MapRegionProps {
  region: RegionWithPointer;
  onMouseEnter: (region: RegionWithPointer) => void;
  onMouseLeave: () => void;
}



// --- Main Component ---
export default function Map3() {
  const [hoveredRegion, setHoveredRegion] = useState<RegionWithPointer | null>(null);
  const [mousePos, setMousePos] = useState<TooltipPosition>({ x: 0, y: 0 });
  const [regions, setRegions] = useState<RegionData[]>(MOCK_REGIONS)
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Загрузка данных о вакансиях
  useEffect(() => {
    const controller = new AbortController();

    async function loadVacancies() {
      setIsLoading(true);
      setError(null);

      const results = await Promise.allSettled(
        regions.map(async (region) => {
          if (!region.name) return region;

          try {
            const total = await fetchVacancies(region.name, controller.signal);
            region.total = total
            const pointer = calculatePointerData(region, scale)
            return { ...region, pointer };
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return region;
            console.error(`Failed to fetch vacancies for ${region.name}:`, err);
            return region;
          }
        })
      );

      const updatedRegions = results.map((result) => {
        if (result.status === 'fulfilled') {
          return result.value
        }
      }

      );

      setRegions(updatedRegions);
      setIsLoading(false);
    }

    loadVacancies();

    return () => controller.abort();
  }, []);

  // Обработчики мыши
  const handleMouseEnter = useCallback((region: RegionWithPointer) => {
    setHoveredRegion(region);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredRegion(null);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  // Zoom контролы
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.max(MIN_SCALE, prev - SCALE_FACTOR));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.min(MAX_SCALE, prev + SCALE_FACTOR));
  }, []);




  function MapRegion(region) {
    return (
      <g
        key={region.id}
        className="region">
        <path
          d={region.path}
          onMouseEnter={() => handleMouseEnter(region)}
          onMouseLeave={handleMouseLeave}
        />
      </g>
    );
  }

  interface MapPointerProps {
    pointer: PointerData;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  }

  function MapPointer(region) {
    if (!region.pointer) return
    return (
      <g
        key={`${region.id}pointer`}
        className="pointer"
        transform={`translate(${region.pointer.pos.x}, ${region.pointer.pos.y})`}
        onMouseEnter={() => handleMouseEnter(region)}
        onMouseLeave={handleMouseLeave}
      >
        <circle
          className="pointer-circle"
          r={region.pointer.radius}
        />
        <text
          className="pointer-text"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontSize: region.pointer.textSize }}
        >
          {region.pointer.text}
        </text>
      </g>
    );
  }




  const regionsWithPointers = useMemo(() => {
    const mapRegions = []
    const mapPointers = []

    regions.map((region) => {
      mapRegions.push(
        MapRegion(region)
      )
      if (region.pointer) {
        region.pointer = calculatePointerData(region, scale)
        mapPointers.push(
          MapPointer(region)
        )
      }
    })
    return [mapRegions, mapPointers]

  }, [regions, scale])



  return (
    <div className="map-container">
      {isLoading && <div className="map-loading">Загрузка данных...</div>}
      {error && <div className="map-error">{error}</div>}

      <svg
        ref={svgRef}
        className="map-svg"
        width={MAP_WIDTH / scale}
        height={MAP_HEIGHT / scale}
        viewBox={`${INITIAL_VIEW_BOX.x} ${INITIAL_VIEW_BOX.y} ${INITIAL_VIEW_BOX.width} ${INITIAL_VIEW_BOX.height}`}
        onMouseMove={handleMouseMove}
      >
        {regionsWithPointers}

        {hoveredRegion && MapRegion(hoveredRegion)}

        {hoveredRegion && MapPointer(hoveredRegion)}




      </svg>

      <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />

      {/* Tooltip */}
      {hoveredRegion && (
        <div
          className="map-tooltip"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y - 10,
          }}
        >
          <div className="tooltip-title">
            <h4>{hoveredRegion.name}</h4>
            {hoveredRegion.total ? (
              <span>{hoveredRegion.total.toLocaleString()} вакансий</span>
            ) : (
              <span>Нет данных</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}