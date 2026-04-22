(function(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.RenderCache = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function defaultCreateSurface(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(width, height);
    }

    if (typeof document !== 'undefined' && document.createElement) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }

    throw new Error('No canvas surface factory available');
  }

  function createLayerCache({ width, height, createSurface = defaultCreateSurface }) {
    let layerWidth = width;
    let layerHeight = height;
    const layers = new Map();

    function createLayer(name) {
      const surface = createSurface(layerWidth, layerHeight);
      surface.width = layerWidth;
      surface.height = layerHeight;

      const ctx = surface.getContext('2d');
      if (!ctx) throw new Error(`Could not create a 2d context for layer "${name}"`);

      const layer = { surface, ctx, dirty: true };
      layers.set(name, layer);
      return layer;
    }

    function getLayer(name) {
      return layers.get(name) || createLayer(name);
    }

    return {
      drawLayer(targetCtx, name, paint) {
        const layer = getLayer(name);

        if (layer.dirty) {
          layer.ctx.clearRect(0, 0, layerWidth, layerHeight);
          paint(layer.ctx, layer.surface);
          layer.dirty = false;
        }

        targetCtx.drawImage(layer.surface, 0, 0);
        return layer.surface;
      },

      invalidate(name) {
        if (typeof name === 'undefined') {
          layers.forEach(layer => { layer.dirty = true; });
          return;
        }

        const layer = layers.get(name);
        if (layer) layer.dirty = true;
      },

      resize(width, height) {
        if (width === layerWidth && height === layerHeight) return false;
        layerWidth = width;
        layerHeight = height;
        layers.clear();
        return true;
      }
    };
  }

  return { createLayerCache };
});
