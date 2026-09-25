/**
 * SHAPES: Polygon (Poligon)
 * Modular plugin for DenjiMotion Studio
 */

(function() {
  'use strict';

  if (!window.FishShapesRegistry) return;

  // Return the polygon vertices in local coordinates. When roundness is
  // greater than zero, each sharp vertex is replaced by a short quadratic
  // corner. The same geometry is used by the canvas path and the wireframe
  // contour so the preview, handles, and export stay in sync.
  function getRawVertices(shapeProps = {}, sx = 300, sy = 300) {
    const rx = sx / 2;
    const ry = sy / 2;
    const sides = Math.max(3, parseInt(shapeProps.sides, 10) || 6);
    const vertices = [];

    for (let i = 0; i < sides; i++) {
      const a = -Math.PI / 2 + (i / sides) * Math.PI * 2;
      vertices.push({ x: Math.cos(a) * rx, y: Math.sin(a) * ry });
    }
    return vertices;
  }

  function getRoundedVertices(shapeProps = {}, sx = 300, sy = 300) {
    const raw = getRawVertices(shapeProps, sx, sy);
    let roundness = Number(shapeProps.roundness);
    if (!Number.isFinite(roundness) || roundness <= 0) return null;

    const baseW = Number(shapeProps.sizeX) > 0 ? Number(shapeProps.sizeX) : sx;
    const scaleR = sx / Math.max(1, baseW);
    const requested = roundness * scaleR;

    return raw.map((corner, index) => {
      const prev = raw[(index + raw.length - 1) % raw.length];
      const next = raw[(index + 1) % raw.length];
      const prevLen = Math.hypot(prev.x - corner.x, prev.y - corner.y) || 1;
      const nextLen = Math.hypot(next.x - corner.x, next.y - corner.y) || 1;
      // Leave a small straight segment between adjacent rounded corners.
      const distance = Math.min(requested, prevLen * 0.46, nextLen * 0.46);
      const prevUnit = { x: (prev.x - corner.x) / prevLen, y: (prev.y - corner.y) / prevLen };
      const nextUnit = { x: (next.x - corner.x) / nextLen, y: (next.y - corner.y) / nextLen };

      return {
        corner,
        start: {
          x: corner.x + prevUnit.x * distance,
          y: corner.y + prevUnit.y * distance
        },
        end: {
          x: corner.x + nextUnit.x * distance,
          y: corner.y + nextUnit.y * distance
        }
      };
    });
  }

  function sampleQuadratic(start, control, end, segments = 5) {
    const points = [start];
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const inv = 1 - t;
      points.push({
        x: inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x,
        y: inv * inv * start.y + 2 * inv * t * control.y + t * t * end.y
      });
    }
    return points;
  }

  window.FishShapesRegistry.register({
    id: 'polygon',
    aliases: ['poligon'],
    name: 'Poligon',
    title: 'Polygon',
    iconSvg: '<path d="M12 2.5l8.66 5v10L12 22.5l-8.66-5v-10L12 2.5z"/>',
    defaultProps: {
      sizeX: 300,
      sizeY: 300,
      sides: 6,
      roundness: 0
    },
    controls: {
      size: true,
      roundness: true,
      step: { label: 'Sides', min: 3, max: 12, default: 6 },
      star: false
    },
    getContour(shapeProps = {}, sx = 300, sy = 300) {
      const rounded = getRoundedVertices(shapeProps, sx, sy);
      if (!rounded) return getRawVertices(shapeProps, sx, sy);

      const points = [];
      rounded.forEach((vertex) => {
        points.push(...sampleQuadratic(vertex.start, vertex.corner, vertex.end));
      });
      return points;
    },
    drawPath(ctx, shapeProps = {}, cx = 0, cy = 0, sx = 300, sy = 300) {
      const rounded = getRoundedVertices(shapeProps, sx, sy);
      if (!rounded) {
        const raw = getRawVertices(shapeProps, sx, sy);
        raw.forEach((point, index) => {
          const px = cx + point.x;
          const py = cy + point.y;
          if (index === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        return;
      }

      const first = rounded[0].start;
      ctx.moveTo(cx + first.x, cy + first.y);
      rounded.forEach((vertex, index) => {
        ctx.quadraticCurveTo(
          cx + vertex.corner.x,
          cy + vertex.corner.y,
          cx + vertex.end.x,
          cy + vertex.end.y
        );
        const next = rounded[(index + 1) % rounded.length].start;
        ctx.lineTo(cx + next.x, cy + next.y);
      });
      ctx.closePath();
    }
  });
})();
