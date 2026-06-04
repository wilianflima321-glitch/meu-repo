import type { EasingType } from "./KeyframeSystem.model";
import type { KeyframePalette } from "./KeyframeSystem.view";

export interface KeyframeContextMenuState {
  x: number;
  y: number;
  trackId: string;
  propertyId: string;
  keyframeId: string;
}

interface KeyframeContextMenuProps {
  menu: KeyframeContextMenuState;
  palette: KeyframePalette;
  onEasingChange: (easing: EasingType) => void;
  onDelete: () => void;
  onClose: () => void;
}

const EASING_OPTIONS: EasingType[] = [
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut",
  "hold",
  "bounce",
  "elastic",
  "bezier",
];

const EASING_ICON: Record<EasingType, string> = {
  linear: "-",
  easeIn: "I",
  easeOut: "O",
  easeInOut: "S",
  hold: "=",
  bounce: "~",
  elastic: "E",
  bezier: "B",
};

export function KeyframeContextMenu({
  menu,
  palette,
  onEasingChange,
  onDelete,
  onClose,
}: KeyframeContextMenuProps) {
  return (
    <div
      style={{
        position: "fixed",
        left: menu.x,
        top: menu.y,
        background: palette.surfaceStrong,
        border: `1px solid ${palette.border}`,
        borderRadius: 4,
        padding: 4,
        zIndex: 1000,
        minWidth: 150,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          padding: "4px 8px",
          color: palette.textTertiary,
          fontSize: 10,
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        Easing
      </div>
      {EASING_OPTIONS.map((easing) => (
        <div
          key={easing}
          onClick={() => onEasingChange(easing)}
          style={{
            padding: "6px 8px",
            cursor: "pointer",
            color: palette.textSecondary,
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = palette.surfaceDeep;
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = "transparent";
          }}
        >
          <span style={{ width: 16 }}>{EASING_ICON[easing]}</span>
          {easing.charAt(0).toUpperCase() + easing.slice(1)}
        </div>
      ))}
      <div
        style={{
          borderTop: `1px solid ${palette.border}`,
          marginTop: 4,
          paddingTop: 4,
        }}
      >
        <div
          onClick={onDelete}
          style={{
            padding: "6px 8px",
            cursor: "pointer",
            color: palette.error,
            fontSize: 11,
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = palette.surfaceDeep;
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = "transparent";
          }}
        >
          Delete keyframe
        </div>
      </div>
    </div>
  );
}
