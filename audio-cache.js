(function(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.AudioCache = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function createNoiseBufferCache({ sampleSource = Math.random } = {}) {
    let contextBuffers = new WeakMap();

    function getKey(duration, sampleRate) {
      const bufferSize = Math.max(1, Math.floor(sampleRate * duration));
      return `${sampleRate}:${bufferSize}`;
    }

    function getContextCache(ctx) {
      let buffers = contextBuffers.get(ctx);
      if (!buffers) {
        buffers = new Map();
        contextBuffers.set(ctx, buffers);
      }
      return buffers;
    }

    function createBuffer(ctx, duration) {
      const sampleRate = ctx.sampleRate;
      const bufferSize = Math.max(1, Math.floor(sampleRate * duration));
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = sampleSource() * 2 - 1;
      return buffer;
    }

    return {
      getBuffer(ctx, duration) {
        const buffers = getContextCache(ctx);
        const key = getKey(duration, ctx.sampleRate);
        let buffer = buffers.get(key);
        if (!buffer) {
          buffer = createBuffer(ctx, duration);
          buffers.set(key, buffer);
        }
        return buffer;
      },
      clear() {
        contextBuffers = new WeakMap();
      }
    };
  }

  return { createNoiseBufferCache };
});
