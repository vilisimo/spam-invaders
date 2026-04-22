const test = require('node:test');
const assert = require('node:assert/strict');

const { createLayerCache } = require('../render-cache.js');

function createMockSurface(width, height) {
  const ctx = {
    clearRectCalls: [],
    clearRect(x, y, w, h) {
      this.clearRectCalls.push([x, y, w, h]);
    }
  };

  return {
    width,
    height,
    getContext(kind) {
      assert.equal(kind, '2d');
      return ctx;
    },
    ctx
  };
}

test('drawLayer reuses a rendered layer until it is invalidated', () => {
  const created = [];
  const cache = createLayerCache({
    width: 800,
    height: 600,
    createSurface(width, height) {
      const surface = createMockSurface(width, height);
      created.push(surface);
      return surface;
    }
  });

  const target = {
    drawImageCalls: [],
    drawImage(surface, x, y) {
      this.drawImageCalls.push([surface, x, y]);
    }
  };

  let paintCalls = 0;
  const paint = ctx => {
    paintCalls++;
    ctx.painted = true;
  };

  cache.drawLayer(target, 'bg', paint);
  cache.drawLayer(target, 'bg', paint);

  assert.equal(created.length, 1);
  assert.equal(paintCalls, 1);
  assert.equal(target.drawImageCalls.length, 2);

  cache.invalidate('bg');
  cache.drawLayer(target, 'bg', paint);

  assert.equal(paintCalls, 2);
});

test('resize clears cached layers and recreates them with the new dimensions', () => {
  const created = [];
  const cache = createLayerCache({
    width: 800,
    height: 600,
    createSurface(width, height) {
      const surface = createMockSurface(width, height);
      created.push(surface);
      return surface;
    }
  });

  const target = {
    drawImage() {}
  };

  let paintCalls = 0;
  const paint = () => { paintCalls++; };

  cache.drawLayer(target, 'bg', paint);
  cache.resize(1024, 768);
  cache.drawLayer(target, 'bg', paint);

  assert.equal(created.length, 2);
  assert.equal(created[1].width, 1024);
  assert.equal(created[1].height, 768);
  assert.equal(paintCalls, 2);
});
