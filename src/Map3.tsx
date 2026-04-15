import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import './Map.css';
//@ts-expect-error
import { getPathLookup } from 'svg-getpointatlength';
import { ZoomControls } from './components/ZoomControls';
import { MOCK_REGIONS, type RegionData } from './ttt';
import { getTextWidth } from './utils/textMeasure';

// --- Constants ---
const MAP_WIDTH = 1280;
const MAP_HEIGHT = 720;
const INITIAL_VIEW_BOX = { x: 0, y: 50, width: 1220, height: 750 };
const SCALE_FACTOR = 0.1;
const MIN_SCALE = 0.2;
const MAX_SCALE = 1;
const FONT_SIZE = 20;

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


// --- Utility Functions ---
function calculatePointerData(
  region: RegionData,
  scale: number,
  fontSize: number = FONT_SIZE
): PointerData | null {
  if (!region.totalVacancies) return null;
  const { path, totalVacancies } = region


  // Создаём временный path элемент для получения BBox
  const lookup = getPathLookup(path)
  const { x, y, width, height } = lookup.getBBox()


  const scaledFont = Math.floor(fontSize * scale)
  const text = String(totalVacancies);
  const textLength = getTextWidth(text, { size: scaledFont });

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
const secret_key = "v3.r.138588701.23d91228908341d593346a84d10b5323830c89f2.9a823a6ac49332b17c851cf1f7dd4457366d5570"//import.meta.env.SUPERJOB_API_KEY

const SUPERJOB_API_URL = "https://api.superjob.ru/2.0/vacancies"


const HH_API_URL = 'https://api.hh.ru/vacancies';

type FetchParamsType = string | string[][] | Record<string, string> | URLSearchParams | undefined;


async function fetchVacancies(baseUrl: string, params: FetchParamsType, signal: AbortSignal, headers: HeadersInit | undefined = undefined): Promise<number> {
  let retryCount = 0;

  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      const paramsData = new URLSearchParams(params);
      const url = `${baseUrl}?${paramsData.toString()}`

      const response = await fetch(url, { headers, signal })
      retryCount++;
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After") || 1);
        console.log(response.headers,
          `Rate limited on ${url}. Retrying after ${retryAfter} seconds...`,
        );

        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000 * retryCount));
        continue;
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch ${url}: HTTP ${response.status}`,
        );
      }

      return await response.json();

    } catch (err) {
      console.error(`Error fetching: ${err}`);
      return 0
    }
  }
}

// --- Sub-components ---
interface MapRegionProps {
  region: RegionWithPointer;
  onMouseEnter: (region: RegionWithPointer) => void;
  onMouseLeave: () => void;
}

function MapRegion({ region, onMouseEnter, onMouseLeave }: MapRegionProps) {
  return (
    <g
      key={region.id}
      className="region">
      <path
        d={region.path}
        onMouseEnter={() => onMouseEnter(region)}
        onMouseLeave={onMouseLeave}
      />
    </g>
  );
}

interface MapPointerProps {
  region: RegionWithPointer;
  onMouseEnter: (region: RegionWithPointer) => void;
  onMouseLeave: () => void;
}

function MapPointer({ region, onMouseEnter, onMouseLeave }: MapPointerProps) {
  if (!region.pointer) return null;
  return (
    <g
      key={`${region.id}pointer`}
      className="pointer"
      transform={`translate(${region.pointer.pos.x}, ${region.pointer.pos.y})`}
      onMouseEnter={() => onMouseEnter(region)}
      onMouseLeave={onMouseLeave}
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

const VACANCIES_PER_PAGE = 1
const PLATFORM_VACANCIES_QTY = String(VACANCIES_PER_PAGE * 1)
const HH_VACANCY_CATEGORIES = ['96', '165']
const SUPERJOB_VACANCY_CATEGORY = '33'



// --- Main Component ---
export default function MapPage() {
  const [hoveredRegion, setHoveredRegion] = useState<RegionWithPointer | null>(null);
  const [mousePos, setMousePos] = useState<TooltipPosition>({ x: 0, y: 0 });
  const [regions, setRegions] = useState<RegionData[]>(MOCK_REGIONS)
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);


  function updatePointer(region) {
    setRegions(prevItems =>
      prevItems.map(item =>
        item.id === region.id
          ? region
          : item
      )
    );
  };

  function groupBy(array, key) {
    return array.reduce((acc, obj) => {
      const value = obj[key];
      (acc[value] = acc[value] || []).push(obj);
      return acc;
    }, {});
  };

  // Загрузка данных о вакансиях
  useEffect(() => {
    const controller = new AbortController()
    //const signal = controller.signal

    async function loadVacancies() {
      const chankSize = 50


      setIsLoading(true);
      setError(null);

      const promises = []
      let result = []

      for (let i = 0; i < regions.length; i += chankSize) {
        const chunk = regions.slice(i, i + chankSize)

        try {
          chunk.forEach(region => {
            const hhParams = {
              "text": region.name,
              "per_page": PLATFORM_VACANCIES_QTY,
              "page": "1",
              "professional_role": "96",
            }
            const hhParamsData = new URLSearchParams(hhParams);
            const hhUrl = `${HH_API_URL}?${hhParamsData.toString()}`

            const sjParams = {
              "keyword": region.name,
              "count": PLATFORM_VACANCIES_QTY,
              "page": "1",
              "catalogues": SUPERJOB_VACANCY_CATEGORY,
            }
            const headers = { "X-Api-App-Id": secret_key }
            const sjParamsData = new URLSearchParams(sjParams);
            const sjUrl = `${SUPERJOB_API_URL}?${sjParamsData.toString()}`

            promises.push(
              fetch(sjUrl, { headers, signal: controller.signal }).then(result => result.json()).then(data => ({ ...region, totalVacancies: data.total || 0 })).catch(console.log),
              fetch(hhUrl, { signal: controller.signal }).then(result => result.json()).then(data => ({ ...region, totalVacancies: data.found || 0 })).catch(console.log)
            )
          }
          )

          const responses = await Promise.allSettled(promises)
          const groupedById = Object.groupBy(responses, ({ value }) => value.id);


          result = Object.values(groupedById).map(items => {
            return items.reduce((acc, val) => {
              acc.value.totalVacancies += val.value.totalVacancies
              return acc
            })
          })

        } catch (err) {
          console.log(err)
        }
      }

      const updatedRegions = result.flatMap(item => {
        if (item.status === 'fulfilled') {
          if (item.value.totalVacancies) {
            const pointer = calculatePointerData(item.value, scale)
            return { ...item.value, pointer }
          }
          return []
        }
      })

      setRegions(updatedRegions)


      setIsLoading(false);

    }

    loadVacancies();

    return () => controller.abort()
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
    setScale((prev) => Math.min(MAX_SCALE, prev - SCALE_FACTOR));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(MIN_SCALE, prev + SCALE_FACTOR));
  }, []);

  const regionsWithPointers = useMemo(() => {
    const mapRegions = [];
    const mapPointers = [];

    for (const region of regions) {
      const pointer = region.totalVacancies ? calculatePointerData(region, scale) : null;
      const regionWithPointer: RegionWithPointer = { ...region, pointer };

      mapRegions.push(
        <MapRegion
          key={region.id}
          region={regionWithPointer}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      );

      if (pointer) {
        mapPointers.push(
          <MapPointer
            key={`${region.id}-pointer`}
            region={regionWithPointer}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        );
      }
    }

    return [mapRegions, mapPointers];
  }, [regions, scale, handleMouseEnter, handleMouseLeave]);



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

        {hoveredRegion && (
          <>
            <MapRegion
              key={`${hoveredRegion.id}-hovered`}
              region={hoveredRegion}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
            <MapPointer
              key={`${hoveredRegion.id}-hovered-pointer`}
              region={hoveredRegion}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
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
            {hoveredRegion.totalVacancies ? (
              <span>{hoveredRegion.totalVacancies.toLocaleString()} вакансий</span>
            ) : (
              <span>Нет данных</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
