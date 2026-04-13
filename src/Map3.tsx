import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Map.css';

import { MOCK_REGIONS, type RegionData } from './ttt';
import { getTextWidth } from './utils/textMeasure';
import { ZoomControls } from './components/ZoomControls';

// --- Constants ---
const MAP_WIDTH = 1280;
const MAP_HEIGHT = 720;
const INITIAL_VIEW_BOX = { x: 0, y: 50, width: 1220, height: 750 };
const SCALE_FACTOR = 0.2;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const FONT_SIZE = 12;
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

  const text = String(region.total);
  const textLength = getTextWidth(text, { size: fontSize });
  const pointPadding = fontSize * 0.5;
  const radius = textLength * 0.5 + pointPadding;

  // Создаём временный path элемент для получения BBox
  const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  tempPath.setAttribute('d', region.path);
  tempSvg.appendChild(tempPath);
  document.body.appendChild(tempSvg);

  const { x, y, width, height } = tempPath.getBBox();
  document.body.removeChild(tempSvg);

  const pointerInRegion = height > 20 && width > 20;
  const offsetY = pointerInRegion ? 0 : height * 0.5 + radius * scale;

  return {
    width: radius * 2,
    height: radius * 2,
    pos: {
      x: x + width / 2,
      y: y + height * 0.5 - offsetY,
    },
    text,
    textSize: fontSize,
    textLength,
    radius,
    offsetY,
  };
}

async function fetchVacancies(regionName: string, signal: AbortSignal): Promise<number> {
  const response = await fetch(
    `${HH_API_URL}?text=${encodeURIComponent(regionName)}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error(`HH API error: ${response.status}`);
  }

  const data: HhApiResponse = await response.json();
  return data.found;
}

// --- Sub-components ---
interface MapRegionProps {
  region: RegionWithPointer;
  onMouseEnter: (region: RegionWithPointer) => void;
  onMouseLeave: () => void;
}

function createMapRegion({ region, onMouseEnter, onMouseLeave }: MapRegionProps) {
  return (
    <path
      className='map-region'
      d={region.path}
      data-region={region.name}
      onMouseEnter={() => onMouseEnter(region)}
      onMouseLeave={onMouseLeave}
    />
  );
}

interface MapPointerProps {
  pointer: PointerData;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function createMapPointer({ pointer, onMouseEnter, onMouseLeave }: MapPointerProps) {
  return (
    <g
      className="map-pointer"
      transform={`translate(${pointer.pos.x}, ${pointer.pos.y - pointer.offsetY})`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <line
        className="pointer-line"
        y2={pointer.offsetY}
      />
      <circle
        className="pointer-circle"
        r={pointer.radius}
      />
      <text
        className="pointer-text"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {pointer.text}
      </text>
    </g>
  );
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
            return { ...region, total };
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return region;
            console.error(`Failed to fetch vacancies for ${region.name}:`, err);
            return region;
          }
        })
      );

      const updatedRegions = results.map((result) =>
        result.status === 'fulfilled' ? result.value : { ...MOCK_REGIONS[regions.indexOf(result.reason)] }
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

  // Вычисляем pointer данные для каждого региона
  const regionsWithPointers = useMemo(() => {
    return regions.map((region) => ({
      ...region,
      pointer: calculatePointerData(region, scale),
    }));
  }, [regions, scale]);



  function renderSvgMap() {
    const mapRegions = []
    const mapPointers = []

    regionsWithPointers.map((region) => {
      mapRegions.push(
        createMapRegion(region)
      )
      if (region.pointer) {
        mapPointers.push(
          createMapPointer(region.pointer)
        )
      }
    })
    return [mapRegions, mapPointers]
  }

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
        {renderSvgMap()}

        {/* Hovered регион поверх остальных */}
        {hoveredRegion && (
          <>
            {createMapRegion(hoveredRegion)}
            {hoveredRegion.pointer && (
              createMapPointer(hoveredRegion?.pointer)
            )}
          </>
        )}
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