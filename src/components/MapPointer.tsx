import type { RegionData } from '../svgMapData';

interface MapPointerProps {
    region: RegionData;
    onMouseEnter: (region: RegionData) => void;
    onTouchStart: (region: RegionData) => void;
    onMouseLeave: () => void;
}

export default function MapPointer({ region, onMouseEnter, onMouseLeave, onTouchStart }: MapPointerProps) {
    if (!region.pointer) return null;
    return (
        <g
            key={`${region.id}-pointer`}
            className={`pointer ${region.pointer && 'hovered'}`}
            transform={`translate(${region.pointer.pos.x}, ${region.pointer.pos.y})`}
            onMouseEnter={() => onMouseEnter(region)}
            onTouchStart={() => onTouchStart(region)}
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