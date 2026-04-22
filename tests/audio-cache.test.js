const test = require('node:test');
const assert = require('node:assert/strict');

const { createNoiseBufferCache } = require('../audio-cache.js');

function createMockAudioContext(sampleRate = 48000) {
  return {
    sampleRate,
    createBufferCalls: [],
    createBuffer(channels, length, rate) {
      const data = new Float32Array(length);
      const buffer = {
        channels,
        length,
        rate,
        getChannelData(channel) {
          assert.equal(channel, 0);
          return data;
        }
      };
      this.createBufferCalls.push(buffer);
      return buffer;
    }
  };
}

test('noise buffer cache reuses a generated buffer for the same context and duration', () => {
  const ctx = createMockAudioContext();
  const cache = createNoiseBufferCache({ sampleSource: () => 0.75 });

  const first = cache.getBuffer(ctx, 0.12);
  const second = cache.getBuffer(ctx, 0.12);

  assert.equal(first, second);
  assert.equal(ctx.createBufferCalls.length, 1);
});

test('noise buffer cache creates distinct buffers for different durations or sample rates', () => {
  const ctxA = createMockAudioContext(48000);
  const ctxB = createMockAudioContext(44100);
  const cache = createNoiseBufferCache({ sampleSource: () => 0.25 });

  const short = cache.getBuffer(ctxA, 0.08);
  const long = cache.getBuffer(ctxA, 0.12);
  const otherRate = cache.getBuffer(ctxB, 0.08);

  assert.notEqual(short, long);
  assert.notEqual(short, otherRate);
  assert.equal(ctxA.createBufferCalls.length, 2);
  assert.equal(ctxB.createBufferCalls.length, 1);
});

test('noise buffer cache does not share buffers across distinct contexts with the same sample rate', () => {
  const ctxA = createMockAudioContext(48000);
  const ctxB = createMockAudioContext(48000);
  const cache = createNoiseBufferCache({ sampleSource: () => 0.5 });

  const first = cache.getBuffer(ctxA, 0.08);
  const second = cache.getBuffer(ctxB, 0.08);

  assert.notEqual(first, second);
  assert.equal(ctxA.createBufferCalls.length, 1);
  assert.equal(ctxB.createBufferCalls.length, 1);
});

test('noise buffer cache fills the audio buffer only once per cached entry', () => {
  let calls = 0;
  const ctx = createMockAudioContext();
  const cache = createNoiseBufferCache({
    sampleSource() {
      calls++;
      return 1;
    }
  });

  const first = cache.getBuffer(ctx, 0.01);
  const second = cache.getBuffer(ctx, 0.01);
  const samples = first.getChannelData(0);

  assert.equal(first, second);
  assert.equal(calls, samples.length);
});
