import React, { useEffect, useRef, useState } from 'react';
import './Map.css';

import { MOCK_REGIONS } from './ttt';
import { getPathLookup } from 'svg-getpointatlength'
import {FiMapPin} from 'react-icons/fi'
import { SocialIcon } from 'react-social-icons';

// --- Styles ---
const styles = {
  container: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif',
  },
  svg: {
    position: 'absolute',
    width: '100%',
    height: 'auto',
    // ViewBox roughly covers the bounding box of Russia
    viewBox: "0 0 1000 600",
    backgroundColor: '#f0f4f8',
    borderRadius: '8px',
  },
  regionPath: {
    fill: '#e2e8f0',
    stroke: '#ffffff',
    strokeWidth: 1,
    transition: 'fill 0.2s ease',
    cursor: 'pointer',
  },
  regionPathHover: {
    fill: '#3b82f6', // Blue highlight
  },
  tooltip: {
    position: 'absolute' as const,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    color: '#fff',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px',
    pointerEvents: 'none' as const, // Crucial: lets mouse events pass through to the map
    zIndex: 10,
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    minWidth: '200px',
  },
  tooltipTitle: {
    fontWeight: 'bold' as const,
    marginBottom: '4px',
    fontSize: '16px',
    borderBottom: '1px solid #555',
    paddingBottom: '4px',
  },
  tooltipRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '4px',
    fontSize: '13px',
    color: '#ccc',
  }
};

interface Vacancy {
  name: string;
  count: number;
}

interface RegionVacancies {
  total: number;
  vacancies: Vacancy[];
}

interface HHResponse {
  found: number;
  items: any[];
}

interface SJResponse {
  total: number;
  objects: any[];
}

function Map3() {
  const [hoveredRegion, setHoveredRegion] = useState<RegionData | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [regionVacancies, setRegionVacancies] = useState([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<SVGSVGElement | null>(null);

  // Fetch vacancies from HH API for a specific region
  const fetchVacancies = async (regionName: string): Promise<any> => {
    // HH API endpoint for vacancies
    const response = await fetch(`https://api.hh.ru/vacancies?text=${encodeURIComponent(regionName)}`);


    if (response.ok) {
      return await response.json()
    }
    throw Error('jkl')



    // const dataHH: HHResponse = await response.json();

    //




  };


  function drawPoints(vacanciesData) {
    const points: { x: number; y: number }[] = []
    const container = mapRef.current?.querySelectorAll(".region-container");
    const icons = []

    if (container) {
      for (let i = 0; i < container.length; i++) {
        const path = container[i].querySelector('.region') as SVGPathElement | null
        //console.log(path)
        if (path) {
          const bbox = path.getBBox()
          const pos = {
            x: bbox.x + bbox.width / 2,
            y: bbox.y + bbox.height / 2
          }

          const region = vacanciesData[i]
          const pointer = container[i].querySelector(".pointer") as SVGForeignObjectElement | null

          if (pointer) {
            pointer.setAttribute('transform', `translate(${pos.x}, ${pos.y - region.pointer.offsetY})`)
            //f.setAttribute('y', String(pos.y))
            //container[i].setAttribute('x', String(pos.x))
            // container[i].setAttribute('y', String(pos.y))
          }


        }
      }

    }
  }

  // Fetch vacancies for all regions on mount
  useEffect(() => {
    const loadVacancies = async () => {

      const promises = MOCK_REGIONS.map(async (region) => {
        if (region.name) {
          let total = 0
          try {
            const hh = await fetchVacancies(region.name);
            total += hh.found
          } catch (e) {
            //  console.log(e)
            return { ...region }
          }




          // const textLength = region.total ? String(region.total).length : 1
          // const radius = 20 + (textLength - 1) * 4
          //const textLength = String(region.pointer.text).length ?? 0;
          //const radius = Math.max(20, textLength * textLength);
          //const textLength = String(region.pointer.text).length
          //const radius = 20 + (textLength - 1) * 4
          //const lineEnd = radius + radius

          if (total) {
            let lookup = getPathLookup(region.path)
            console.log(lookup)
            const { x, y, width, height } = lookup.getBBox()
            const pos = {
              x: x + width / 2,
              y: y + height / 2
            }

            const textLength = String(total).length ?? 0
            const radius = Math.max(20, textLength * textLength)
            const offsetY = radius * 2

            region.pointer = {
              width: radius * 2,
              height: radius * 2 + offsetY,
              pos,
              text: total,
              textLength,
              radius,
              offsetY,
            }
          }

          return { ...region }
        }
      })
      Promise.allSettled(promises).then(results => {
        console.log('rrr', results)

        const vacanciesData = results.map((result, idx) => {
          if (result.status === 'fulfilled') {
            return result.value
          } else {
            console.log('TTTT', idx, result.reason)
            return MOCK_REGIONS[idx]
          }
        }
        )

        //console.log(vacanciesData)
        setRegionVacancies(vacanciesData);
       // drawPoints(vacanciesData)

      })

    };

    loadVacancies();
  }, []);





  function handlePointClick() {

  }



  const handleMouseEnter = (region: RegionData) => {
    setHoveredRegion(region);
  };

  const handleMouseLeave = () => {
    setHoveredRegion(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };


  function drawPoints2() {

    //const containers = mapRef.current?.querySelectorAll(".region-container");


    // if (container) {
    return regionVacancies.map(region => {



      if (region.pointer) {
        return (
<svg className='pointer' width={region.pointer.width} height={region.pointer.height}  transform={`translate(${region.pointer.pos.x}, ${region.pointer.pos.y - region.pointer.offsetY})`}>
          <g transform={`translate(${region.pointer.radius}, ${region.pointer.radius})`}>
              <line
                x1='0'
                y1='0'
                x2='0'
                y2={region.pointer.offsetY}
                stroke='#3b82f6'
                strokeWidth='2'
                className='pointer-line'
              />
              <circle
                r={region.pointer.radius}
                fill='#3b82f6'

                className='pointer-circle'
              />
              <text
                textAnchor='middle'
                dominantBaseline='central'
                className='point-text'
                style={{ fontSize: '14px', fontWeight: 'bold' }}
              >
                {region.pointer.text}
              </text>
</g>
            
            
            </svg>
        )
      }
    }

    )


    // return points
  }

  return (
    <div
      ref={containerRef}
      className='wrap'
      onMouseMove={handleMouseMove}
    >
      
      <svg ref={mapRef} width="1920" height="1080">


        {regionVacancies.map((region, idx) => {
          //console.log("kjkl", region)
          return (
            <g className='region-container'>
              <path
                className='region'
                key={region.id}
                d={region.path}
              />
              <text>{region.name}</text>
              {region.name == 'Саха' ? (
               <foreignObject x="600" y="330" width="50" height="50">
                            <SocialIcon style={{ width: 50, height: 50 }} />
                            </foreignObject>
              ) : null
      }

            </g>
          )

        }
        )}


      </svg>
 {drawPoints2()}



      {hoveredRegion && (
        <div
          style={{
            ...styles.tooltip,
            left: mousePos.x + 15, // Offset slightly from cursor
            top: mousePos.y + 15,
          }}
        >
          <div style={styles.tooltipTitle}>{hoveredRegion.name}</div>
          <div style={{ marginBottom: '8px' }}>{hoveredRegion.description}</div>

          <div style={styles.tooltipRow}>
            <span>Capital:</span>
            <span>{hoveredRegion.capital}</span>
          </div>
          <div style={styles.tooltipRow}>
            <span>Population:</span>
            <span>{hoveredRegion.population}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map3