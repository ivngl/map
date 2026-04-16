import type { RegionData } from '../svgMapData';

interface MapPointerProps {
    region: RegionData;
    onMouseEnter: (region: RegionData) => void;
    onClick: (region: RegionData) => void;
    onMouseLeave: () => void;
    isActive?: boolean;
}

export default function MapPointer({ region, isActive, onMouseEnter, onMouseLeave, onClick }: MapPointerProps) {
    if (!region.pointer) return null;
    return (
        <g
            key={`${region.id}-pointer`}
            className={`pointer ${isActive && 'active'}`}
            transform={`translate(${region.pointer.pos.x}, ${region.pointer.pos.y})`}
            onMouseEnter={() => onMouseEnter(region)}
            onClick={() => onClick(region)}
            onMouseLeave={onMouseLeave}
        >
            <circle className="pointer-circle" r={region.pointer.radius} />
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