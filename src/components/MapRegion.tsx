import type { RegionData } from '../svgMapData';

interface MapRegionProps {
    region: RegionData;
    onMouseEnter: (region: RegionData) => void;
    onTouchStart: (region: RegionData) => void;
    onMouseLeave: () => void;
}

export default function MapRegion({ region, onMouseEnter, onMouseLeave }: MapRegionProps) {
    return (
        <g key={region.id} className={`region ${region.isActive ? 'active' : ''}`}>
            <path
                d={region.path}
                onMouseEnter={() => onMouseEnter(region)}
                onTouchStart={() => onMouseEnter(region)}
                onMouseLeave={onMouseLeave}
            />
        </g>
    );
}
