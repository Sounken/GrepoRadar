"use client";
import { useRef, useEffect, useCallback, useState } from "react";
import { useTheme } from "@/components/theme-provider";

export type MapTown = {
  id: number;
  name?: string;
  x: number;
  y: number;
  points: number;
  playerId?: number | null;
  type?: string;
  isMe?: boolean;
};

type IslandPoint = { x: number; y: number; type: number; inhabited: boolean };

interface ServerMapProps {
  towns: MapTown[];
  highlightId?: number | null;
  onTownClick?: (town: MapTown) => void;
  height?: number;
  originTownId?: number | null;
}

const TYPE_DOTS: Record<string, string> = {
  mine: "#8b7ff5",
  active: "#22c78a",
  suspect: "#f59e0b",
  inactive: "#f43f5e",
  ghost: "#4a6080",
};

// Couleur de fond (correspond à l'eau dans le watertile)
const OCEAN_BG = "#1a3d5c";

// 1 tile Grepolis = 256px = 1 world unit
// uninhabited{N}.png : 640×448px → 640/256=2.5wu × 448/256=1.75wu
const ISLAND_WORLD_W = 2.5;
const ISLAND_WORLD_H = ISLAND_WORLD_W * (448 / 640); // ≈ 1.75

// watertile.png : 1024×512px → 1024/256=4wu × 512/256=2wu
const WATER_TILE_W = 4.0;
const WATER_TILE_H = 2.0;

const MIN_ISLAND_SCALE = 1.5;

// Cache d'images partagé entre les renders — clé: "island-16" ou "uninhabited-3"
const islandImageCache = new Map<string, HTMLImageElement>();

function getIslandImageInfo(island: IslandPoint): { key: string; url: string } {
  const prefix = island.inhabited ? "island" : "uninhabited";
  // inhabited uses %26 (confirmed: type=42 → 16); clamped to 20 because island21-26.png don't exist
  const modulo = island.inhabited ? 26 : 20;
  const normalizedType = Math.min(((island.type - 1) % modulo) + 1, 20);
  return { key: `${prefix}-${normalizedType}`, url: `/api/island-tile?prefix=${prefix}&type=${normalizedType}` };
}

type View = { scale: number; offsetX: number; offsetY: number };

function computeInitialView(towns: MapTown[], W: number, H: number): View {
  if (towns.length === 0) {
    const s = Math.min(W, H) / 1000;
    return { scale: s, offsetX: 0, offsetY: 0 };
  }
  const xs = towns.map((t) => t.x);
  const ys = towns.map((t) => t.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = Math.max(maxX - minX, 50);
  const rangeY = Math.max(maxY - minY, 50);
  const pad = 0.15;
  const s = Math.min(
    (W * (1 - pad * 2)) / rangeX,
    (H * (1 - pad * 2)) / rangeY,
  );
  return {
    scale: s,
    offsetX: W / 2 - ((minX + maxX) / 2) * s,
    offsetY: H / 2 - ((minY + maxY) / 2) * s,
  };
}

function worldToScreen(wx: number, wy: number, view: View): [number, number] {
  return [wx * view.scale + view.offsetX, wy * view.scale + view.offsetY];
}

export function ServerMap({
  towns,
  highlightId,
  onTownClick,
  height = 300,
  originTownId,
}: ServerMapProps) {
  const { t } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View>({ scale: 1, offsetX: 0, offsetY: 0 });
  const townsRef = useRef(towns);
  const highlightRef = useRef(highlightId);
  const originRef = useRef(originTownId);
  const islandsRef = useRef<IslandPoint[]>([]);
  const boundsRef = useRef<{ xMin: number; xMax: number; yMin: number; yMax: number } | null>(null);
  const waterTileRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{
    dragging: boolean;
    lastX: number;
    lastY: number;
    moved: boolean;
  }>({
    dragging: false,
    lastX: 0,
    lastY: 0,
    moved: false,
  });
  const rafRef = useRef<number>(0);
  const scheduleRedrawRef = useRef<() => void>(() => {});
  const initialized = useRef(false);
  const minScaleRef = useRef(0.3);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    town: MapTown;
  } | null>(null);

  townsRef.current = towns;
  highlightRef.current = highlightId;
  originRef.current = originTownId;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const view = viewRef.current;
    const currentTowns = townsRef.current;
    const islandData = islandsRef.current;
    const dpr = window.devicePixelRatio || 1;
    const dW = canvas.width / dpr;
    const dH = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Fond : couleur unie d'abord (comble les transparences résiduelles)
    ctx.fillStyle = OCEAN_BG;
    ctx.fillRect(0, 0, dW, dH);

    // Watertile pré-compositée (opaque) : une seule passe suffit
    const wt = waterTileRef.current;
    if (wt && wt.width > 0) {
      const tw = WATER_TILE_W * view.scale;
      const th = WATER_TILE_H * view.scale;
      const ox = ((view.offsetX % tw) + tw) % tw;
      const oy = ((view.offsetY % th) + th) % th;
      for (let tx = ox - tw; tx < dW + tw; tx += tw) {
        for (let ty = oy - th; ty < dH + th; ty += th) {
          ctx.drawImage(wt, tx, ty, tw, th);
        }
      }
    }

    // Grid lines légères
    const gridStep =
      view.scale > 6 ? 10 : view.scale > 2 ? 25 : view.scale > 0.8 ? 50 : 100;
    const majorStep = gridStep * 5;
    const startX = Math.floor(-view.offsetX / view.scale / gridStep) * gridStep;
    const startY = Math.floor(-view.offsetY / view.scale / gridStep) * gridStep;

    for (
      let gx = startX;
      gx <= startX + dW / view.scale + gridStep;
      gx += gridStep
    ) {
      const [sx] = worldToScreen(gx, 0, view);
      const isMajor = gx % majorStep === 0;
      ctx.strokeStyle = isMajor ? "#ffffff20" : "#ffffff0c";
      ctx.lineWidth = isMajor ? 0.8 : 0.4;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, dH);
      ctx.stroke();
    }
    for (
      let gy = startY;
      gy <= startY + dH / view.scale + gridStep;
      gy += gridStep
    ) {
      const [, sy] = worldToScreen(0, gy, view);
      const isMajor = gy % majorStep === 0;
      ctx.strokeStyle = isMajor ? "#ffffff20" : "#ffffff0c";
      ctx.lineWidth = isMajor ? 0.8 : 0.4;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(dW, sy);
      ctx.stroke();
    }

    // Labels de coordonnées
    if (view.scale > 0.5) {
      ctx.fillStyle = "#ffffff44";
      ctx.font = `${Math.min(10, view.scale * 8)}px monospace`;
      ctx.textAlign = "left";
      for (
        let gx = Math.ceil(startX / majorStep) * majorStep;
        gx <= startX + dW / view.scale + majorStep;
        gx += majorStep
      ) {
        const [sx] = worldToScreen(gx, 0, view);
        if (sx > 2 && sx < dW - 2) ctx.fillText(String(gx), sx + 2, 10);
      }
    }

    // --- ÎLES ---
    if (view.scale >= MIN_ISLAND_SCALE && islandData.length > 0) {
      const drawW = ISLAND_WORLD_W * view.scale;
      const drawH = ISLAND_WORLD_H * view.scale;
      const halfW = drawW / 2;
      const halfH = drawH / 2;

      // Île d'origine : coordonnées exactes (town.x == island.x, town.y == island.y)
      const originTown = originRef.current
        ? currentTowns.find((tw) => tw.id === originRef.current)
        : null;
      const originIsland = originTown
        ? (islandData.find(
            (isl) => isl.x === originTown.x && isl.y === originTown.y,
          ) ?? null)
        : null;

      for (const island of islandData) {
        const [cx, cy] = worldToScreen(island.x, island.y, view);
        if (
          cx + halfW < 0 ||
          cx - halfW > dW ||
          cy + halfH < 0 ||
          cy - halfH > dH
        )
          continue;

        const { key: imgKey } = getIslandImageInfo(island);
        const img = islandImageCache.get(imgKey);
        if (img?.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, cx - halfW, cy - halfH, drawW, drawH);
        }

        // Overlay bleu sur l'île d'origine
        if (
          originIsland &&
          island.x === originIsland.x &&
          island.y === originIsland.y
        ) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = "#2266ff";
          ctx.beginPath();
          ctx.ellipse(cx, cy, halfW * 0.7, halfH * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = "#55aaff";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // --- VILLES ---
    currentTowns.forEach((town) => {
      const [cx, cy] = worldToScreen(town.x, town.y, view);
      if (cx < -20 || cx > dW + 20 || cy < -20 || cy > dH + 20) return;

      const isHL = town.id === highlightRef.current;
      const isOrigin = town.id === originRef.current;
      const type = isOrigin
        ? "mine"
        : town.isMe
          ? "mine"
          : (town.type ?? "active");
      const col = TYPE_DOTS[type] ?? TYPE_DOTS.active;
      const baseR = 2.5 + Math.sqrt(town.points / 5000) * 1.5;
      const r = isOrigin ? Math.max(baseR, 6) : isHL ? baseR * 1.5 : baseR;

      if (isHL || isOrigin) {
        const glowR = r * (isOrigin ? 3.5 : 4);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
        g.addColorStop(0, col + "55");
        g.addColorStop(1, col + "00");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = col + (isHL || isOrigin ? "ff" : "dd");
      ctx.fill();

      if (isHL || isOrigin) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (isOrigin && town.name) {
        ctx.font = "bold 11px 'DM Sans', sans-serif";
        ctx.textAlign = "center";
        const labelY = cy - r - 5;
        const tw = ctx.measureText(town.name).width;
        ctx.fillStyle = "#00000099";
        ctx.beginPath();
        ctx.roundRect(cx - tw / 2 - 4, labelY - 11, tw + 8, 14, 3);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.fillText(town.name, cx, labelY);
      }
    });

    // Indicateur zoom
    ctx.fillStyle = "#ffffff55";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(view.scale * 10) / 10}x`, dW - 8, dH - 8);

    ctx.restore();
  }, []);

  const scheduleRedraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  scheduleRedrawRef.current = scheduleRedraw;

  // Chargement du watertile (une seule fois) — pré-composite pour éliminer toute transparence
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const oc = document.createElement("canvas");
      oc.width = w;
      oc.height = h;
      const octx = oc.getContext("2d");
      if (octx) {
        // Offset exact : (128, 64) = chaque diamant fait 256×128px dans le spritesheet 1024×512
        const dx = w / 8; // 128
        const dy = h / 8; // 64
        octx.fillStyle = OCEAN_BG;
        octx.fillRect(0, 0, w, h);
        // Pass 1 : normal
        octx.drawImage(img, 0, 0);
        // Pass 2 : 4 copies avec wrap-around pour couvrir tout le canvas
        octx.drawImage(img, dx, dy); // bas-droite
        octx.drawImage(img, dx - w, dy); // bas-gauche (wrap)
        octx.drawImage(img, dx, dy - h); // haut-droite (wrap)
        octx.drawImage(img, dx - w, dy - h); // haut-gauche (wrap coin)
      }
      waterTileRef.current = oc;
      scheduleRedrawRef.current();
    };
    img.onerror = () => {};
    img.src = "/api/water-tile";
  }, []);

  // Fetch islands quand les towns changent
  useEffect(() => {
    if (towns.length === 0) return;
    // Recalcule minScale et corrige la vue si elle a été initialisée sans towns
    const container = containerRef.current;
    if (container) {
      const w = container.getBoundingClientRect().width || 800;
      const fitView = computeInitialView(towns, w, height);
      minScaleRef.current = Math.min(
        fitView.scale,
        Math.max(fitView.scale / 6, height / 300),
      );
      // Si la vue courante est anormalement dézoomée (initialisée sans towns), on la recentre
      if (viewRef.current.scale < minScaleRef.current) {
        viewRef.current = fitView;
        scheduleRedrawRef.current();
      }
    }
    const xs = towns.map((tw) => tw.x);
    const ys = towns.map((tw) => tw.y);
    const pad = 25;
    const xMin = Math.max(0, Math.min(...xs) - pad);
    const xMax = Math.min(999, Math.max(...xs) + pad);
    const yMin = Math.max(0, Math.min(...ys) - pad);
    const yMax = Math.min(999, Math.max(...ys) + pad);

    fetch(`/api/islands?xMin=${xMin}&xMax=${xMax}&yMin=${yMin}&yMax=${yMax}`)
      .then((r) => r.json())
      .then((data) => {
        const isl: IslandPoint[] = data.islands ?? [];
        islandsRef.current = isl;
        // Mise à jour des bornes pour le clamping du pan
        if (isl.length > 0) {
          let x0 = isl[0].x, x1 = isl[0].x, y0 = isl[0].y, y1 = isl[0].y;
          for (const p of isl) {
            if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
            if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
          }
          boundsRef.current = { xMin: x0 - 5, xMax: x1 + 5, yMin: y0 - 5, yMax: y1 + 5 };
        }
        const needed = new Map<string, string>(
          (data.islands ?? []).map((i: IslandPoint) => {
            const { key, url } = getIslandImageInfo(i);
            return [key, url];
          }),
        );
        for (const [imgKey, imgUrl] of needed) {
          if (!islandImageCache.has(imgKey)) {
            const img = new Image();
            img.onload = () => scheduleRedrawRef.current();
            img.onerror = () => {};
            img.src = imgUrl;
            islandImageCache.set(imgKey, img);
          }
        }
        scheduleRedrawRef.current();
      })
      .catch(() => {});
  }, [towns]);

  // Setup canvas : observe le CONTAINER pour avoir la bonne largeur
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const setupCanvas = (displayW: number) => {
      const dpr = window.devicePixelRatio || 1;
      const displayH = height;
      const newW = Math.round(displayW * dpr);
      const newH = Math.round(displayH * dpr);
      const fitView = computeInitialView(townsRef.current, displayW, displayH);
      // plancher = on ne peut pas voir plus de ~300 unités en hauteur (height/300),
      // sauf si fitScale est déjà plus petit (towns très dispersées)
      minScaleRef.current = Math.min(
        fitView.scale,
        Math.max(fitView.scale / 1, displayH / 300),
      );
      if (canvas.width === newW && canvas.height === newH) {
        scheduleRedraw();
        return;
      }
      canvas.width = newW;
      canvas.height = newH;
      if (!initialized.current || townsRef.current.length > 0) {
        viewRef.current = computeInitialView(
          townsRef.current,
          displayW,
          displayH,
        );
        initialized.current = true;
      }
      scheduleRedraw();
    };

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setupCanvas(w);
    });
    ro.observe(container);
    // Appel initial
    setupCanvas(container.getBoundingClientRect().width || 800);
    return () => ro.disconnect();
  }, [height, scheduleRedraw]);

  // Redraw quand towns/highlight changent
  useEffect(() => {
    scheduleRedraw();
  }, [towns, highlightId, originTownId, scheduleRedraw]);

  // Clamp l'offset pour rester dans les bornes des îles affichées
  const clampView = useCallback((v: View): View => {
    const b = boundsRef.current;
    const canvas = canvasRef.current;
    if (!b || !canvas) return v;
    const dpr = window.devicePixelRatio || 1;
    const dW = canvas.width / dpr;
    const dH = canvas.height / dpr;
    return {
      scale: v.scale,
      offsetX: Math.max(-b.xMax * v.scale, Math.min(dW - b.xMin * v.scale, v.offsetX)),
      offsetY: Math.max(-b.yMax * v.scale, Math.min(dH - b.yMin * v.scale, v.offsetY)),
    };
  }, []);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const view = viewRef.current;
      const newScale = Math.max(
        minScaleRef.current,
        Math.min(30, view.scale * factor),
      );
      const rf = newScale / view.scale;
      viewRef.current = clampView({
        scale: newScale,
        offsetX: mx - (mx - view.offsetX) * rf,
        offsetY: my - (my - view.offsetY) * rf,
      });
      scheduleRedraw();
    },
    [scheduleRedraw, clampView],
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = {
      dragging: true,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      const drag = dragRef.current;
      if (drag.dragging) {
        const dx = e.clientX - drag.lastX;
        const dy = e.clientY - drag.lastY;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
        viewRef.current = clampView({
          ...viewRef.current,
          offsetX: viewRef.current.offsetX + dx,
          offsetY: viewRef.current.offsetY + dy,
        });
        setTooltip(null);
        scheduleRedraw();
        return;
      }
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const view = viewRef.current;
      let closest: MapTown | null = null;
      let minDist = 14;
      for (const town of townsRef.current) {
        const [cx, cy] = worldToScreen(town.x, town.y, view);
        const d = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
        if (d < minDist) {
          minDist = d;
          closest = town;
        }
      }
      setTooltip(closest ? { x: mx, y: my, town: closest } : null);
    },
    [scheduleRedraw, clampView],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const drag = dragRef.current;
      drag.dragging = false;
      if (!drag.moved && onTownClick) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const view = viewRef.current;
        let best: MapTown | null = null;
        let minD = 14;
        for (const town of townsRef.current) {
          const [cx, cy] = worldToScreen(town.x, town.y, view);
          const d = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
          if (d < minD) {
            minD = d;
            best = town;
          }
        }
        if (best) onTownClick(best);
      }
    },
    [onTownClick],
  );

  const handleMouseLeave = useCallback(() => {
    dragRef.current.dragging = false;
    setTooltip(null);
  }, []);

  const resetView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.getBoundingClientRect().width;
    viewRef.current = computeInitialView(townsRef.current, w, height);
    scheduleRedraw();
  }, [height, scheduleRedraw]);

  const zoom = useCallback(
    (factor: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      const cx = r.width / 2,
        cy = r.height / 2;
      const v = viewRef.current;
      const ns = Math.max(minScaleRef.current, Math.min(30, v.scale * factor));
      const f = ns / v.scale;
      viewRef.current = clampView({
        scale: ns,
        offsetX: cx - (cx - v.offsetX) * f,
        offsetY: cy - (cy - v.offsetY) * f,
      });
      scheduleRedraw();
    },
    [scheduleRedraw, clampView],
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: OCEAN_BG,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: `${height}px`,
          cursor: "crosshair",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x + 14,
            top: tooltip.y - 10,
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 11,
            color: t.text,
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            zIndex: 10,
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontWeight: 600 }}>{tooltip.town.name}</div>
          <div
            style={{
              color: t.textLight,
              fontSize: 10,
              fontFamily: "var(--font-dm-mono), monospace",
            }}
          >
            {tooltip.town.x}|{tooltip.town.y} ·{" "}
            {tooltip.town.points.toLocaleString()} pts
          </div>
        </div>
      )}

      {/* Contrôles zoom */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          right: 10,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {(
          [
            { label: "+", fn: () => zoom(1.3) },
            { label: "−", fn: () => zoom(1 / 1.3) },
            { label: "⊙", fn: resetView },
          ] as { label: string; fn: () => void }[]
        ).map(({ label, fn }) => (
          <button
            key={label}
            onClick={fn}
            style={{
              width: 28,
              height: 28,
              background: t.bgCard + "ee",
              border: `1px solid ${t.border}`,
              borderRadius: 7,
              color: t.textMid,
              fontSize: label === "⊙" ? 14 : 16,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
