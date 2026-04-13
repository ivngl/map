interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut }: ZoomControlsProps) {
  return (
    <div className="zoom-controls">
      <button onClick={onZoomIn} aria-label="Увеличить">+</button>
      <button onClick={onZoomOut} aria-label="Уменьшить">−</button>
    </div>
  );
}
