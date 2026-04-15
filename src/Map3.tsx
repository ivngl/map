import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Map.css';

import { Tooltip } from '@mantine/core';
import MapPointer from './components/MapPointer';
import MapRegion from './components/MapRegion';
import { ZoomControls } from './components/ZoomControls';
import { MOCK_REGIONS, type RegionData } from './ttt';
import calculatePointerData from './utils/calculatePointerData';


const MAP_WIDTH = 1280;
const MAP_HEIGHT = 720;
const INITIAL_VIEW_BOX = { x: 0, y: 50, width: 1220, height: 750 };
const SCALE_FACTOR = 0.1;
const MIN_SCALE = 0.2;
const MAX_SCALE = 1;
const CHUNK_SIZE = 100;

// API constants
const SUPERJOB_API_URL = 'https://api.superjob.ru/2.0/vacancies';
const HH_API_URL = 'https://api.hh.ru/vacancies';
const SUPERJOB_VACANCY_CATEGORY = '33';
const HH_PROFESSIONAL_ROLE = '96';
const VACANCIES_PER_PAGE = '1';


interface TooltipPosition {
  x: number;
  y: number;
}



async function fetchSuperjobVacancies(
  regionName: string,
  signal: AbortSignal,
): Promise<number> {
  const params = new URLSearchParams({
    keyword: regionName,
    count: VACANCIES_PER_PAGE,
    page: '1',
    catalogues: SUPERJOB_VACANCY_CATEGORY,
  });
  const headers = { 'X-Api-App-Id': import.meta.env.VITE_SUPERJOB_API_KEY };

  const response = await fetch(`${SUPERJOB_API_URL}?${params}`, {
    headers,
    signal,
  });

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After') || 1);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return fetchSuperjobVacancies(regionName, signal);
  }

  if (!response.ok) return 0;
  const data = await response.json();
  return data.total ?? 0;
}

async function fetchHhVacancies(
  regionName: string,
  signal: AbortSignal,
): Promise<number> {
  const params = new URLSearchParams({
    text: regionName,
    per_page: VACANCIES_PER_PAGE,
    page: '1',
    professional_role: HH_PROFESSIONAL_ROLE,
  });

  const response = await fetch(`${HH_API_URL}?${params}`, { signal });

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After') || 1);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return fetchHhVacancies(regionName, signal);
  }

  if (!response.ok) return 0;
  const data = await response.json();
  return data.found ?? 0;
}




// --- Main Component ---
export default function MapPage() {
  const [regions, setRegions] = useState<RegionData[]>(() =>
    MOCK_REGIONS.splice(0, 10).map((r) => ({ ...r, pointer: null })),
  );
  const [hoveredRegion, setHoveredRegion] = useState<RegionData | null>(
    null,
  );
  const [mousePos, setMousePos] = useState<TooltipPosition>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Загрузка данных о вакансиях
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function loadVacancies() {
      setIsLoading(true);
      setError(null);

      try {
        const updatedRegions: RegionData[] = [];

        for (let i = 0; i < regions.length; i += CHUNK_SIZE) {
          const chunk = regions.slice(i, i + CHUNK_SIZE);

          const chunkPromises = chunk.map((region) =>
            Promise.allSettled([
              fetchSuperjobVacancies(region.name, signal),
              fetchHhVacancies(region.name, signal),
            ]).then(([sjResult, hhResult]) => {
              const sjTotal = sjResult.status === 'fulfilled' ? sjResult.value : 0;
              const hhTotal = hhResult.status === 'fulfilled' ? hhResult.value : 0;
              const totalVacancies = sjTotal + hhTotal;

              const updated: RegionData = {
                ...region,
                totalVacancies,
                pointer: totalVacancies ? calculatePointerData({ ...region, totalVacancies }, scale) : null,
              };
              return updated;
            }),
          );

          const chunkResults = await Promise.all(chunkPromises);
          updatedRegions.push(...chunkResults);
        }

        setRegions(updatedRegions);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (signal.aborted) return;
        setError(message);
        console.error('Failed to load vacancies:', err);
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadVacancies();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Обработчики мыши
  const handleMouseEnter = useCallback((region: RegionData) => {
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

  const regionsWithPointers = useMemo(() => {
    const mapRegions: React.ReactNode[] = [];
    const mapPointers: React.ReactNode[] = [];

    for (const region of regions) {
      const pointer = region.totalVacancies ? calculatePointerData(region, scale) : null;
      const regionWithPointer: RegionData = { ...region, pointer };

      mapRegions.push(
        <MapRegion
          key={region.id}
          region={regionWithPointer}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />,
      );

      if (pointer) {
        mapPointers.push(
          <MapPointer
            key={`${region.id}-pointer`}
            region={regionWithPointer}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />,
        );
      }
    }

    return [...mapRegions, ...mapPointers];
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

      <ZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        canZoomOut={scale < MAX_SCALE}
        canZoomIn={scale > MIN_SCALE}
      />

      {hoveredRegion && (
        <Tooltip
          position="top"
          opened
          label={hoveredRegion.name}
          offset={{ mainAxis: 6, crossAxis: 1 }}
        >
          <div
            className='map-tooltip'
            style={{
              left: mousePos.x + 15,
              top: mousePos.y - 10,
            }}
          >
          </div>
        </Tooltip>
      )}
    </div>
  );
}
