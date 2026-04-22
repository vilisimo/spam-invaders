const test = require('node:test');
const assert = require('node:assert/strict');

const {
  advanceBulletsInPlace,
  resolveBulletEmailCollisionsInPlace,
  resolveEmailsInPlace,
  advanceParticlesInPlace
} = require('../entity-updates.js');

test('advanceBulletsInPlace updates positions and compacts survivors in place', () => {
  const bullets = [
    { id: 'keep-a', y: 20, vy: -5 },
    { id: 'drop', y: -8, vy: -5 },
    { id: 'keep-b', y: 12, vy: -3 }
  ];

  const result = advanceBulletsInPlace(bullets, -10);

  assert.equal(result, bullets);
  assert.deepEqual(
    bullets.map(b => ({ id: b.id, y: b.y })),
    [
      { id: 'keep-a', y: 15 },
      { id: 'keep-b', y: 9 }
    ]
  );
});

test('resolveBulletEmailCollisionsInPlace removes colliding bullets and the last matching email first', () => {
  const bullets = [
    { id: 'miss', x: 5, y: 5 },
    { id: 'hit', x: 20, y: 20 },
    { id: 'after', x: 40, y: 40 }
  ];
  const emails = [
    { id: 'older', x: 20, y: 20 },
    { id: 'newer', x: 20, y: 20 },
    { id: 'other', x: 40, y: 41 }
  ];
  const hits = [];

  const result = resolveBulletEmailCollisionsInPlace({
    bullets,
    emails,
    collides(bullet, email) {
      return Math.abs(bullet.x - email.x) <= 1 && Math.abs(bullet.y - email.y) <= 1;
    },
    onCollision(bullet, email) {
      hits.push(`${bullet.id}:${email.id}`);
    }
  });

  assert.equal(result.bullets, bullets);
  assert.equal(result.emails, emails);
  assert.deepEqual(hits, ['hit:newer', 'after:other']);
  assert.deepEqual(bullets.map(b => b.id), ['miss']);
  assert.deepEqual(emails.map(e => e.id), ['older']);
});

test('resolveBulletEmailCollisionsInPlace preserves an explicit clear performed by the collision callback', () => {
  const bullets = [{ id: 'hit', x: 10, y: 10 }, { id: 'after', x: 30, y: 30 }];
  const emails = [{ id: 'clear', x: 10, y: 10 }, { id: 'stale', x: 30, y: 30 }];

  resolveBulletEmailCollisionsInPlace({
    bullets,
    emails,
    collides(bullet, email) {
      return bullet.x === email.x && bullet.y === email.y;
    },
    onCollision(_bullet, _email) {
      emails.length = 0;
    }
  });

  assert.deepEqual(emails, []);
  assert.deepEqual(bullets.map(b => b.id), ['after']);
});

test('resolveBulletEmailCollisionsInPlace preserves a clear when the hit email is not first', () => {
  const bullets = [{ id: 'hit', x: 30, y: 30 }, { id: 'after', x: 50, y: 50 }];
  const emails = [
    { id: 'older', x: 10, y: 10 },
    { id: 'trigger-clear', x: 30, y: 30 },
    { id: 'newer', x: 50, y: 50 }
  ];

  resolveBulletEmailCollisionsInPlace({
    bullets,
    emails,
    collides(bullet, email) {
      return bullet.x === email.x && bullet.y === email.y;
    },
    onCollision() {
      emails.length = 0;
    }
  });

  assert.deepEqual(emails, []);
  assert.deepEqual(bullets.map(b => b.id), ['after']);
});

test('resolveEmailsInPlace removes handled emails and preserves survivor order', () => {
  const emails = [
    { id: 'hit' },
    { id: 'keep-a' },
    { id: 'fall' },
    { id: 'keep-b' }
  ];
  const removed = [];

  const result = resolveEmailsInPlace({
    emails,
    classify(email) {
      if (email.id === 'hit') return 'hitMailman';
      if (email.id === 'fall') return 'fellPast';
      return null;
    },
    onRemove(email, reason) {
      removed.push(`${email.id}:${reason}`);
    }
  });

  assert.equal(result, emails);
  assert.deepEqual(removed, ['hit:hitMailman', 'fall:fellPast']);
  assert.deepEqual(emails.map(e => e.id), ['keep-a', 'keep-b']);
});

test('resolveEmailsInPlace preserves an explicit clear performed by the removal callback', () => {
  const emails = [
    { id: 'keep-before-clear' },
    { id: 'trigger-clear' },
    { id: 'never-visited' }
  ];

  resolveEmailsInPlace({
    emails,
    classify(email) {
      return email.id === 'trigger-clear' ? 'hitMailman' : null;
    },
    onRemove(_email, _reason) {
      emails.length = 0;
    }
  });

  assert.deepEqual(emails, []);
});

test('advanceParticlesInPlace updates and compacts survivors in place', () => {
  const particles = [
    { id: 'keep', x: 1, y: 2, vx: 3, vy: 4, life: 1, decay: 0.2 },
    { id: 'drop', x: 5, y: 6, vx: 0, vy: 1, life: 0.05, decay: 0.1 }
  ];

  const result = advanceParticlesInPlace(particles);

  assert.equal(result, particles);
  assert.deepEqual(
    particles.map(p => ({ id: p.id, x: p.x, y: p.y, life: p.life })),
    [{ id: 'keep', x: 4, y: 6, life: 0.8 }]
  );
});
