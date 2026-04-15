import { Button } from '@mantine/core';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

export function ZoomControls({ onZoomIn, onZoomOut, canZoomIn, canZoomOut }: ZoomControlsProps) {
  return (
    <div className="zoom-controls">
      <Button variant="filled" color="gray" onClick={onZoomIn} disabled={!canZoomIn} aria-label="Увеличить">+</Button>
      <Button variant="filled" color="gray" onClick={onZoomOut} disabled={!canZoomOut} aria-label="Уменьшить">−</Button>
    </div>
  );
}
