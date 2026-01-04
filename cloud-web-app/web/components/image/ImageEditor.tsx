/**
 * Image Editor - Editor de imagem REAL com Canvas
 * 
 * Suporta layers, blend modes, brushes básicos.
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  canvas: HTMLCanvasElement;
  locked: boolean;
}

export type BlendMode = 
  | 'normal' 
  | 'multiply' 
  | 'screen' 
  | 'overlay' 
  | 'darken' 
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

export type Tool = 'brush' | 'eraser' | 'fill' | 'eyedropper' | 'move' | 'select';

interface BrushSettings {
  size: number;
  hardness: number;
  opacity: number;
  color: string;
}

function createLayer(name: string, w: number, h: number): Layer {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  return {
    id: `layer-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    visible: true,
    opacity: 100,
    blendMode: 'normal',
    canvas,
    locked: false,
  };
}

// ============================================================================
// IMAGE EDITOR COMPONENT
// ============================================================================

interface ImageEditorProps {
  width: number;
  height: number;
  initialImage?: string;
  onSave?: (dataUrl: string) => void;
}

export function ImageEditor({
  width = 800,
  height = 600,
  initialImage,
  onSave,
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('brush');
  const [brush, setBrush] = useState<BrushSettings>({
    size: 10,
    hardness: 100,
    opacity: 100,
    color: '#ffffff',
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  // Inicializar com layer de fundo
  useEffect(() => {
    const bgLayer = createLayer('Background', width, height);
    const ctx = bgLayer.canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    
    setLayers([bgLayer]);
    setActiveLayerId(bgLayer.id);

    // Carregar imagem inicial se fornecida
    if (initialImage) {
      const img = new Image();
      img.onload = () => {
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Força um re-render do preview quando a imagem termina de carregar
          // (o canvas da layer mudou, mas o array de layers não muda sozinho)
          setLayers((prev) =>
            prev.map((layer) => (layer.id === bgLayer.id ? { ...layer } : layer))
          );
        }
      };
      img.src = initialImage;
    }
  }, [width, height, initialImage]);

  // Renderizar todas as layers no canvas principal
  const renderAllLayers = useCallback(() => {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas) return;

    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;

    // Limpar com padrão xadrez (transparência)
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);
    
    // Desenhar padrão de transparência
    const checkSize = 10;
    ctx.fillStyle = '#2a2a2a';
    for (let y = 0; y < height; y += checkSize * 2) {
      for (let x = 0; x < width; x += checkSize * 2) {
        ctx.fillRect(x, y, checkSize, checkSize);
        ctx.fillRect(x + checkSize, y + checkSize, checkSize, checkSize);
      }
    }

    // Desenhar cada layer visível
    layers.forEach(layer => {
      if (!layer.visible) return;

      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = blendModeToComposite(layer.blendMode);
      ctx.drawImage(layer.canvas, 0, 0);
    });

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }, [layers, width, height]);

  // Re-renderizar quando layers mudam
  useEffect(() => {
    renderAllLayers();
  }, [renderAllLayers]);

  // Converter blend mode para globalCompositeOperation
  const blendModeToComposite = (mode: BlendMode): GlobalCompositeOperation => {
    const map: Record<BlendMode, GlobalCompositeOperation> = {
      'normal': 'source-over',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'darken': 'darken',
      'lighten': 'lighten',
      'color-dodge': 'color-dodge',
      'color-burn': 'color-burn',
      'hard-light': 'hard-light',
      'soft-light': 'soft-light',
      'difference': 'difference',
      'exclusion': 'exclusion',
    };
    return map[mode] || 'source-over';
  };

  // Desenhar com brush
  const draw = useCallback((x: number, y: number) => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer || activeLayer.locked) return;

    const ctx = activeLayer.canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = brush.color;
      ctx.globalAlpha = brush.opacity / 100;
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
    } else {
      return;
    }

    // Desenhar círculo (brush)
    ctx.beginPath();
    ctx.arc(x, y, brush.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Conectar com posição anterior (linha suave)
    if (lastPos) {
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(x, y);
      ctx.lineWidth = brush.size;
      ctx.lineCap = 'round';
      ctx.strokeStyle = tool === 'brush' ? brush.color : 'rgba(0,0,0,1)';
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    
    renderAllLayers();
  }, [activeLayerId, layers, tool, brush, lastPos, renderAllLayers]);

  // Event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'eyedropper') {
      pickColor(x, y);
      return;
    }

    if (tool === 'fill') {
      floodFill(x, y);
      return;
    }

    setIsDrawing(true);
    setLastPos({ x, y });
    draw(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    draw(x, y);
    setLastPos({ x, y });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setLastPos(null);
  };

  // Eyedropper
  const pickColor = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const color = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
    setBrush(prev => ({ ...prev, color }));
  };

  // Flood fill (simples, não otimizado)
  const floodFill = (startX: number, startY: number) => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer || activeLayer.locked) return;

    const ctx = activeLayer.canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const targetColor = getPixel(data, startX, startY);
    const fillColor = hexToRgb(brush.color);

    if (colorsEqual(targetColor, fillColor)) return;

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const currentColor = getPixel(data, x, y);
      if (!colorsEqual(currentColor, targetColor)) continue;

      visited.add(key);
      setPixel(data, x, y, fillColor);

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
    renderAllLayers();
  };

  const getPixel = (data: Uint8ClampedArray, x: number, y: number): number[] => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };

  const setPixel = (data: Uint8ClampedArray, x: number, y: number, color: number[]) => {
    const i = (y * width + x) * 4;
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = 255;
  };

  const colorsEqual = (c1: number[], c2: number[]): boolean => {
    return c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2];
  };

  const hexToRgb = (hex: string): number[] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  };

  // Add new layer
  const addLayer = () => {
    const newLayer = createLayer(`Layer ${layers.length + 1}`, width, height);
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  // Delete layer
  const deleteLayer = (id: string) => {
    if (layers.length <= 1) return;
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeLayerId === id) {
      setActiveLayerId(layers[0].id);
    }
  };

  // Export
  const handleSave = () => {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas) return;

    // Criar canvas final sem o padrão de transparência
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    layers.forEach(layer => {
      if (!layer.visible) return;
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = blendModeToComposite(layer.blendMode);
      ctx.drawImage(layer.canvas, 0, 0);
    });

    const dataUrl = exportCanvas.toDataURL('image/png');
    onSave?.(dataUrl);
  };

  return (
    <div className="flex h-full bg-slate-900">
      {/* Toolbar */}
      <div className="w-12 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-2 gap-1">
        {(['brush', 'eraser', 'fill', 'eyedropper', 'move'] as Tool[]).map(t => (
          <button
            key={t}
            onClick={() => setTool(t)}
            className={`w-10 h-10 rounded flex items-center justify-center text-lg ${
              tool === t ? 'bg-blue-600' : 'hover:bg-slate-700'
            }`}
            title={t.charAt(0).toUpperCase() + t.slice(1)}
          >
            {t === 'brush' && '🖌️'}
            {t === 'eraser' && '🧽'}
            {t === 'fill' && '🪣'}
            {t === 'eyedropper' && '💉'}
            {t === 'move' && '✋'}
          </button>
        ))}
        
        <div className="mt-4 flex flex-col items-center gap-2">
          <input
            type="color"
            value={brush.color}
            onChange={(e) => setBrush(prev => ({ ...prev, color: e.target.value }))}
            className="w-8 h-8 cursor-pointer"
          />
          <span className="text-xs text-slate-400">Color</span>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="border border-slate-600 cursor-crosshair"
          style={{ 
            cursor: tool === 'eyedropper' ? 'crosshair' : 
                   tool === 'move' ? 'grab' : 
                   'crosshair' 
          }}
        />
      </div>

      {/* Brush Settings */}
      <div className="w-48 bg-slate-800 border-l border-slate-700 p-3">
        <h3 className="text-sm font-semibold text-white mb-3">Brush</h3>
        
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Size: {brush.size}px</label>
            <input
              type="range"
              min="1"
              max="100"
              value={brush.size}
              onChange={(e) => setBrush(prev => ({ ...prev, size: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="text-xs text-slate-400">Opacity: {brush.opacity}%</label>
            <input
              type="range"
              min="1"
              max="100"
              value={brush.opacity}
              onChange={(e) => setBrush(prev => ({ ...prev, opacity: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>
        </div>

        <h3 className="text-sm font-semibold text-white mt-6 mb-3">Layers</h3>
        
        <button
          onClick={addLayer}
          className="w-full py-1 bg-blue-600 rounded text-sm mb-2 hover:bg-blue-500"
        >
          + Add Layer
        </button>

        <div className="space-y-1 max-h-48 overflow-y-auto">
          {[...layers].reverse().map(layer => (
            <div
              key={layer.id}
              onClick={() => setActiveLayerId(layer.id)}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                activeLayerId === layer.id ? 'bg-slate-600' : 'hover:bg-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={(e) => {
                  e.stopPropagation();
                  setLayers(prev => prev.map(l => 
                    l.id === layer.id ? { ...l, visible: !l.visible } : l
                  ));
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-white flex-1 truncate">{layer.name}</span>
              {layers.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLayer(layer.id);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2 bg-green-600 rounded text-sm mt-4 hover:bg-green-500"
        >
          💾 Export PNG
        </button>
      </div>
    </div>
  );
}

export default ImageEditor;
