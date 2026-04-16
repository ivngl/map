import type { RegionData } from '../svgMapData';

interface MapRegionProps {
    region: RegionData;
    onMouseEnter: (region: RegionData) => void;
    onClick: (region: RegionData) => void;
    onMouseLeave: () => void;
    isActive?: boolean;
}

export default function MapRegion({ region, isActive, onMouseEnter, onMouseLeave, onClick }: MapRegionProps) {
    return (
        <g key={region.id} className={`region ${isActive && 'active'}`}>
            <path
                d={region.path}
                onMouseEnter={() => onMouseEnter(region)}
                onClick={() => onClick(region)}
                onMouseLeave={onMouseLeave}
            />
        </g>
    );
}
