import type { RegionData } from '../svgMapData';

interface MapRegionProps {
    region: RegionData;
    onMouseEnter: (region: RegionData) => void;
    onClick: (region: RegionData) => void;
    onMouseLeave: () => void;
}

export default function MapRegion({ region, onMouseEnter, onMouseLeave, onClick }: MapRegionProps) {
    return (
        <g key={region.id} className='region'>
            <path
                d={region.path}
                onMouseEnter={() => onMouseEnter(region)}
                onClick={() => onClick(region)}
                onMouseLeave={onMouseLeave}
            />
        </g>
    );
}
