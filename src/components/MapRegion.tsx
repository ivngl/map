import type { RegionData } from '../svgMapData';

interface MapRegionProps {
    region: RegionData;
    onMouseEnter: (region: RegionData) => void;
    onTouchStart: (region: RegionData) => void;
    onMouseLeave: () => void;
}

export default function MapRegion({ region, onMouseEnter, onMouseLeave, onTouchStart }: MapRegionProps) {
    return (
        <g key={region.id} className={`region ${region.isActive ? 'active' : ''}`}>
            <path
                d={region.path}
                onMouseEnter={() => onMouseEnter(region)}
                onTouchStart={() => onTouchStart(region)}
                onMouseLeave={onMouseLeave}
            />
        </g>
    );
}
