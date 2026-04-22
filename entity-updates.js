(function(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.EntityUpdates = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function advanceBulletsInPlace(bullets, ceilingY = -10) {
    let write = 0;

    for (let read = 0; read < bullets.length; read++) {
      const bullet = bullets[read];
      bullet.y += bullet.vy;
      if (bullet.y > ceilingY) bullets[write++] = bullet;
    }

    bullets.length = write;
    return bullets;
  }

  function resolveBulletEmailCollisionsInPlace({ bullets, emails, collides, onCollision }) {
    let bulletWrite = 0;

    for (let bulletRead = 0; bulletRead < bullets.length; bulletRead++) {
      const bullet = bullets[bulletRead];
      let hit = false;

      for (let emailIndex = emails.length - 1; emailIndex >= 0; emailIndex--) {
        const email = emails[emailIndex];
        if (email === null) continue;
        if (!collides(bullet, email)) continue;

        onCollision(bullet, email, emailIndex);
        emails[emailIndex] = null;
        hit = true;
        break;
      }

      if (!hit) bullets[bulletWrite++] = bullet;
    }

    bullets.length = bulletWrite;

    let emailWrite = 0;
    for (let emailRead = 0; emailRead < emails.length; emailRead++) {
      const email = emails[emailRead];
      if (email !== null) emails[emailWrite++] = email;
    }
    emails.length = emailWrite;

    return { bullets, emails };
  }

  function resolveEmailsInPlace({ emails, classify, onRemove }) {
    let write = 0;

    for (let read = 0; read < emails.length; read++) {
      const email = emails[read];
      const reason = classify(email, read);

      if (reason) {
        onRemove(email, reason, read);
        if (emails.length === 0) {
          write = 0;
          break;
        }
        continue;
      }

      emails[write++] = email;
    }

    emails.length = write;
    return emails;
  }

  function advanceParticlesInPlace(particles) {
    let write = 0;

    for (let read = 0; read < particles.length; read++) {
      const particle = particles[read];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= particle.decay;
      if (particle.life > 0) particles[write++] = particle;
    }

    particles.length = write;
    return particles;
  }

  return {
    advanceBulletsInPlace,
    resolveBulletEmailCollisionsInPlace,
    resolveEmailsInPlace,
    advanceParticlesInPlace
  };
});
