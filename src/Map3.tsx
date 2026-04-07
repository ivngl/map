import React, { useEffect, useRef, useState } from 'react';
import './Map.css';

import { SocialIcon } from 'react-social-icons';
import { getPathLookup } from 'svg-getpointatlength';
import { MOCK_REGIONS } from './ttt';
import { TiSortAlphabetically } from 'react-icons/ti';

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

  const [viewBox, setViewBox] = useState({x: 0, y: 0, width: 1920, height: 1080})
  const [scale, setScale] = useState(1.2)
  const [fontSize, setFontSize] = useState(12)

  // Fetch vacancies from HH API for a specific region
  const fetchVacancies = async (regionName: string): Promise<any> => {
    // HH API endpoint for vacancies
    const response = await fetch(`https://api.hh.ru/vacancies?text=${encodeURIComponent(regionName)}`);


    if (response.ok) {
      return await response.json()
    }
    throw Error('jkl')

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

  function getTextWidth(text: string, size: number = 10, family: string = 'arial') {
    // if given, use cached canvas for better performance
    // else, create new canvas
    const font = `${size}px ${family}`
    var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
    var context = canvas.getContext("2d");
    context.font = font;
    var metrics = context.measureText(text);
    return metrics.width;
};
  // Fetch vacancies for all regions on mount
  function getPointData(path, total, font = 12) {
    let lookup = getPathLookup(path)
            const { x, y, width, height } = lookup.getBBox()


            //const textLength = String(total).length ?? 0

            const textLength = getTextWidth(total, font)
            const pointPadding = font * .5
            const pointMarging = 5
            const radius = textLength * .5 + pointPadding
            const offsetY = height > radius * 5 ? 0 : height * .5 + radius + pointMarging

            const pos = {
              x: x + width / 2 - radius,
              y: y + height / 2 - radius
            }

            return {
              width: radius * 2,
              height: radius * 2,
              pos,
              text: total,
              textSize: font,
              textLength,
              radius,
              offsetY,
            }
        
    }
  
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

          if (total) {
            region.pointer = getPointData(region.path, total)
            //region.pointer.text = total
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


  const handleMouseEnter = (region: RegionData) => {
    setHoveredRegion(region);
  };

  const handleMouseLeave = (region) => {
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
          <svg onMouseEnter={() => handleMouseEnter(region)}
            onMouseLeave={() => handleMouseLeave(region)} className='pointer' data-region={region.name} width={region.pointer.width} height={region.pointer.height + 20} transform={`translate(${region.pointer.pos.x}, ${region.pointer.pos.y - region.pointer.offsetY})`}>
            <g
              transform={`translate(${region.pointer.radius}, ${region.pointer.radius})`}>
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

                className={region.name}
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
  function createMapRegion(region, isActive: boolean = false) {
    
    return ( <g className='region'>
        <path
          data-region={region.name}
          className={`region ${region.name}`}
          key={region.id}
          d={region.path}
          onMouseEnter={() => handleMouseEnter(region)}
          onMouseLeave={() => handleMouseLeave(region)}
        />
      </g>
    )
  }
  function createMapPointer(region, isActive: boolean = false) {
    const styles = {
      stroke: isActive ? 'white' : '',
    }

    return (
      <svg onMouseEnter={() => handleMouseEnter(region)}
        onMouseLeave={() => handleMouseLeave(region)} className='pointer' 
        data-region={region.name} 
        width={region.pointer.width} 
        height={region.pointer.height + 20} 
        transform={`translate(${region.pointer.pos.x}, ${region.pointer.pos.y - region.pointer.offsetY})`}>
        <g
          transform={`translate(${region.pointer.radius}, ${region.pointer.radius})`}>
          <circle
            r={region.pointer.radius}
            fill='#3b82f6'
            className={region.name}
          />
          <text
            textAnchor='middle'
            dominantBaseline='central'
            className='pointer-text'
            style={{fontSize: region.pointer.textSize}}
            >
            {region.pointer.text}
          </text>
        </g>
      </svg>)
  }

  function renderSvgMap() {

    const mapRegions = []
    const mapPointers = []

    regionVacancies.map((region, idx) => {
      mapRegions.push(
        createMapRegion(region)
      )
      if (region.pointer) {
        mapPointers.push(
          createMapPointer(region)
        )
      }
    })
    return [mapRegions, mapPointers]
  }

    

  
  function handleZoom() {
    const newViewBox = {x: 0, y: 0, 
      width: viewBox.width / scale, 
      height: viewBox.height / scale}
   setViewBox(newViewBox)
   setFontSize(fontSize => fontSize / scale)
   const newRegionVacancies = regionVacancies.map(region => {
    console.log(region.pointer)
    if(region.pointer) {
      region.pointer = getPointData(region.path, region.pointer.text, fontSize / scale)
    } 
    return region
    }
   )
   setRegionVacancies(newRegionVacancies);
        
   //mapRef.current.setAttribute('viewBox', `${newViewBox.x} ${newViewBox.y} ${newViewBox.width} ${newViewBox.height}`);

  }

  function handleZoomOut() {
    const newViewBox = {x: 0, y: 0, 
      width: viewBox.width * scale, 
      height: viewBox.height * scale}
   setViewBox(newViewBox)
   //mapRef.current.setAttribute('viewBox', `${newX} ${newY} ${width} ${height}`);

   setFontSize(fontSize => fontSize * scale)
   const newRegionVacancies = regionVacancies.map(region => {
    console.log(region.pointer)
    if(region.pointer) {
      region.pointer = getPointData(region.path, region.pointer.text, fontSize * scale)
    } 
    return region
    }
   )
   setRegionVacancies(newRegionVacancies);
  }


  return (
    <div
      ref={containerRef}
      className='wrap'
      onMouseMove={handleMouseMove}
    >
      <svg ref={mapRef} width="1920" height="1080" 
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}>
        {renderSvgMap()}
        {hoveredRegion && (
          <>
            {createMapRegion(hoveredRegion, true)}
            {hoveredRegion.pointer && (
              createMapPointer(hoveredRegion, true)
            )}
          </>
        )}
      </svg>
      <div style={{position: 'fixed',zIndex: 999999,
   top: '50px', left: '50px'}}>
<button  onClick={handleZoom}>
+
 </button>
 <button  onClick={handleZoomOut}>
-
 </button>
      </div>
 
     
      {hoveredRegion && (
        <div
          style={{
            ...styles.tooltip,
            left: mousePos.x + 50,
            top: mousePos.y - 20,
          }}
        >
          <div style={styles.tooltipTitle}>
            <h4>{hoveredRegion.name}</h4>
            <span> {hoveredRegion?.pointer?.text} vacancies</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map3