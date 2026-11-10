/* ===================================================================
   Robo — cute 3D robot (Three.js r128)
   White chibi body, big glowing ring eyes, a little smile, blush cheeks
   and headphone ears — inspired by friendly companion-robot designs.

   API used by app.js:
       Robot.set("idle" | "listening" | "thinking" | "speaking")
       Robot.state
       Robot.wave()          – friendly greeting wave
       Robot.react("poke")   – bouncy reaction (also fired on click)
   Interactivity: eyes/head follow the cursor, drag to rotate (horizontal)
   and tilt up/down (vertical), click to poke, idle glances, blinking.
   =================================================================== */

const Robot = (() => {
  const container = document.getElementById("robotCanvas");

  const COL = {
    white: 0xeef2f9,
    silver: 0xb9c3d4,
    darkSilver: 0x8b94a8,
    screen: 0x0a0b14,
    cyan: 0x37e1ff,
    cyanSoft: 0x9bf0ff,
    pink: 0xff8fb4,
  };

  // ---- Renderer / scene / camera --------------------------------------
  const renderer = new THREE.WebGLRenderer({
    antialias: true, alpha: true, preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 1.45, 6.6);
  camera.lookAt(0, 1.2, 0);

  // ---- Lights ----------------------------------------------------------
  scene.add(new THREE.AmbientLight(0x8090b0, 1.0));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
  keyLight.position.set(4, 8, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 30;
  keyLight.shadow.camera.left = -6;
  keyLight.shadow.camera.right = 6;
  keyLight.shadow.camera.top = 6;
  keyLight.shadow.camera.bottom = -6;
  keyLight.shadow.radius = 5;
  scene.add(keyLight);
  const fill = new THREE.DirectionalLight(0xbcd0ff, 0.5);
  fill.position.set(-5, 3, 4);
  scene.add(fill);
  const rimCyan = new THREE.PointLight(0x37e1ff, 0.6, 20);
  rimCyan.position.set(-4, 1.5, -3);
  scene.add(rimCyan);

  // ---- Materials -------------------------------------------------------
  const whiteMat = new THREE.MeshStandardMaterial({ color: COL.white, metalness: 0.25, roughness: 0.45 });
  const silverMat = new THREE.MeshStandardMaterial({ color: COL.silver, metalness: 0.9, roughness: 0.28 });
  const darkSilverMat = new THREE.MeshStandardMaterial({ color: COL.darkSilver, metalness: 0.85, roughness: 0.35 });
  const screenMat = new THREE.MeshStandardMaterial({ color: COL.screen, metalness: 0.35, roughness: 0.28 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: COL.cyanSoft, emissive: COL.cyan, emissiveIntensity: 1.7 });
  const smileMat = new THREE.MeshStandardMaterial({ color: COL.cyanSoft, emissive: COL.cyan, emissiveIntensity: 1.4 });
  const chestMat = new THREE.MeshStandardMaterial({ color: COL.cyanSoft, emissive: COL.cyan, emissiveIntensity: 1.3 });
  const cheekMat = new THREE.MeshStandardMaterial({ color: COL.pink, emissive: COL.pink, emissiveIntensity: 0.9, transparent: true, opacity: 0.92 });

  function glowTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const glowTex = glowTexture();
  function makeGlow(color, size) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    s.scale.set(size, size, 1);
    return s;
  }

  // ---- Robot root ------------------------------------------------------
  const robot = new THREE.Group();
  scene.add(robot);

  // ---- Body (rounded white tummy) -------------------------------------
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.82, 48, 48), whiteMat);
  body.scale.set(0.92, 0.86, 0.86);
  body.position.y = 0.42;
  body.castShadow = true;
  robot.add(body);

  // belly seam / lower panel
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.6, 40, 40), whiteMat);
  belly.scale.set(0.9, 0.7, 0.7);
  belly.position.set(0, 0.2, 0.34);
  robot.add(belly);

  // glowing chest button
  const chest = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32), chestMat);
  chest.position.set(0, 0.55, 0.73);
  robot.add(chest);
  const chestGlow = makeGlow(COL.cyan, 0.85);
  chestGlow.position.copy(chest.position);
  chestGlow.position.z += 0.02;
  robot.add(chestGlow);

  // little feet
  for (const sx of [-1, 1]) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 28), whiteMat);
    foot.scale.set(1, 0.55, 1.15);
    foot.position.set(sx * 0.34, -0.42, 0.12);
    foot.castShadow = true;
    robot.add(foot);
  }

  // ---- Arms: silver shoulder joints + white arms & mitts --------------
  // Each arm hangs from a pivot at the shoulder, so it stays attached and
  // visible from every angle and can swing / wave.
  const armPivots = [];
  const armRest = []; // resting rotation.z per arm
  for (let i = 0; i < 2; i++) {
    const sx = i === 0 ? -1 : 1;
    // silver shoulder joint sits at the body's edge so the arm clears the body
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.19, 28, 28), silverMat);
    shoulder.position.set(sx * 0.82, 0.6, 0.08);
    shoulder.castShadow = true;
    robot.add(shoulder);

    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.82, 0.6, 0.08);

    // smooth rounded arm = cylinder capped by a sphere hand (capsule look)
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.34, 24), whiteMat);
    arm.position.set(0, -0.2, 0);
    arm.castShadow = true;
    pivot.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 28), whiteMat);
    hand.position.set(0, -0.4, 0);
    hand.castShadow = true;
    pivot.add(hand);

    const rest = sx * 0.34; // splay outward so mitts stay clear of the body
    pivot.rotation.z = rest;
    robot.add(pivot);
    armPivots.push(pivot);
    armRest.push(rest);
  }

  // ---- Head ------------------------------------------------------------
  const head = new THREE.Group();
  head.position.y = 1.78;
  robot.add(head);

  // white helmet/skull
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1.0, 56, 56), whiteMat);
  skull.scale.set(1.14, 1.06, 1.0);
  skull.castShadow = true;
  head.add(skull);

  // silver top cap for a helmet feel
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, 56, 56, 0, Math.PI * 2, 0, Math.PI * 0.42),
    silverMat
  );
  cap.scale.set(1.16, 1.08, 1.02);
  head.add(cap);

  // headphone-style ears
  for (const sx of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 32), silverMat);
    cup.rotation.z = Math.PI / 2;
    cup.position.set(sx * 1.12, -0.02, 0);
    cup.castShadow = true;
    head.add(cup);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.18, 24), darkSilverMat);
    inner.rotation.z = Math.PI / 2;
    inner.position.set(sx * 1.16, -0.02, 0);
    head.add(inner);
  }

  // big glossy black face screen (wide oval)
  const screen = new THREE.Mesh(new THREE.SphereGeometry(0.66, 56, 56), screenMat);
  screen.scale.set(1.42, 1.02, 0.42);
  screen.position.set(0, 0.02, 0.72);
  head.add(screen);

  // ---- Eyes: big glowing cyan rings -----------------------------------
  const eyes = new THREE.Group();
  head.add(eyes);
  const eyeMeshes = [];
  const eyeGlows = [];
  for (const sx of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.045, 20, 44), eyeMat);
    ring.position.set(sx * 0.36, 0.08, 0.98);
    eyes.add(ring);
    eyeMeshes.push(ring);
    // inner soft fill
    const inner = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32),
      new THREE.MeshStandardMaterial({ color: COL.cyan, emissive: COL.cyan, emissiveIntensity: 0.6, transparent: true, opacity: 0.35 }));
    inner.position.set(sx * 0.36, 0.08, 0.96);
    eyes.add(inner);
    const eg = makeGlow(COL.cyan, 0.7);
    eg.position.set(sx * 0.36, 0.08, 1.02);
    eyes.add(eg);
    eyeGlows.push(eg);
    // sparkle
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    spark.position.set(sx * 0.36 - 0.07, 0.16, 1.03);
    eyes.add(spark);
  }

  // ---- Smile (glowing arc) --------------------------------------------
  const smileGroup = new THREE.Group();
  smileGroup.position.set(0, -0.22, 0.95);
  head.add(smileGroup);
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.028, 12, 28, Math.PI), // half ring
    smileMat
  );
  smile.rotation.z = Math.PI; // flip into a ∪ smile
  smileGroup.add(smile);

  // ---- Blush cheeks (sit in front of the screen so they're visible) ---
  for (const sx of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), cheekMat);
    cheek.position.set(sx * 0.6, -0.16, 0.96);
    head.add(cheek);
  }

  // tiny forehead sensor dot
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), chestMat);
  dot.position.set(0, 0.62, 0.82);
  head.add(dot);

  // ---- Listening ripple ring ------------------------------------------
  const ringMat = new THREE.MeshBasicMaterial({ color: COL.cyan, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const ripple = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.03, 12, 64), ringMat);
  ripple.position.y = 1.75;
  ripple.rotation.x = Math.PI / 2;
  robot.add(ripple);

  // ---- Thinking dots ---------------------------------------------------
  const thinkDots = new THREE.Group();
  thinkDots.position.set(0, 1.3, 0);
  head.add(thinkDots);
  const dots = [];
  for (let i = 0; i < 3; i++) {
    dots.push(new THREE.Mesh(new THREE.SphereGeometry(0.06 + i * 0.02, 20, 20), chestMat));
    thinkDots.add(dots[i]);
  }
  thinkDots.visible = false;

  // ---- Ground shadow ---------------------------------------------------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.3 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.62;
  ground.receiveShadow = true;
  scene.add(ground);

  // ===================================================================
  // State + interaction
  // ===================================================================
  const STATES = ["idle", "listening", "thinking", "speaking"];
  let current = "idle";
  function set(state) {
    if (!STATES.includes(state) || state === current) return;
    current = state;
    thinkDots.visible = state === "thinking";
  }

  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  let pointerOver = false;
  let dragging = false, lastX = 0, lastY = 0, spin = 0, spinVel = 0;
  let pitch = 0, pitchVel = 0;
  let downX = 0, downY = 0, moved = false;
  let waveT = -1, pokeT = -1;
  let nextBlink = 1.5, blinkT = -1;
  let gazeTimer = 0;
  let hopT = -1, hopTimer = 5 + Math.random() * 4; // occasional happy hop

  const clock = new THREE.Clock();
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function wave() { waveT = 0; }
  function react(kind) {
    if (kind === "poke" || kind === undefined) { pokeT = 0; spinVel += 0.05; }
  }

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta(), 0.05);

    // occasional happy hop while idle
    hopTimer -= dt;
    if (hopT < 0 && current === "idle" && hopTimer <= 0) { hopT = 0; hopTimer = 7 + Math.random() * 5; }
    let hopY = 0, hopSq = 0;
    if (hopT >= 0) {
      hopT += dt * 1.5;
      const k = Math.sin(Math.min(hopT, 1) * Math.PI);
      hopY = k * 0.28; hopSq = k * 0.06;
      if (hopT >= 1) hopT = -1;
    }

    // float + bouncy breathing (+ hop)
    robot.position.y = Math.sin(t * 1.7) * 0.09 + hopY;
    const breath = Math.sin(t * 2.4);
    body.scale.set(0.92 + breath * 0.02 - hopSq * 0.6, 0.86 + breath * 0.03 + hopSq, 0.86 - hopSq * 0.6);

    // idle auto-glance when the cursor isn't on the robot
    gazeTimer -= dt;
    if (!pointerOver && gazeTimer <= 0) {
      look.tx = (Math.random() - 0.5) * 0.8;
      look.ty = (Math.random() - 0.5) * 0.4;
      gazeTimer = 1.8 + Math.random() * 2.5;
    }

    // spin (horizontal drag) + tilt (vertical drag) with easing
    if (!dragging) {
      spinVel *= 0.94;
      if (Math.abs(spinVel) < 0.0002) spinVel = 0;
      spin += spinVel; // momentum from dragging only — no auto-spin
      pitchVel *= 0.92;
      pitch += pitchVel;
      pitch = lerp(pitch, 0, 0.015); // eases slowly back toward level
    }
    pitch = clamp(pitch, -1.2, 1.3);
    robot.rotation.y = spin;
    robot.rotation.x = pitch + Math.sin(t * 1.2) * 0.02;
    robot.rotation.z = Math.sin(t * 0.9) * 0.02;

    // eased cursor look
    look.x = lerp(look.x, look.tx, 0.08);
    look.y = lerp(look.y, look.ty, 0.08);

    // per-state head pose
    let tiltZ = 0, headPitch = 0, yaw = look.x;
    if (current === "listening") tiltZ = 0.12;
    if (current === "thinking") { headPitch = -0.2; yaw = look.x + Math.sin(t) * 0.15; }
    if (current === "speaking") headPitch = Math.sin(t * 6) * 0.03;
    head.rotation.x = lerp(head.rotation.x, headPitch - look.y, 0.1);
    head.rotation.y = lerp(head.rotation.y, yaw, 0.1);
    head.rotation.z = lerp(head.rotation.z, tiltZ, 0.1);

    // eyes drift within the face
    eyes.position.x = lerp(eyes.position.x, look.x * 0.05, 0.1);
    eyes.position.y = lerp(eyes.position.y, -look.y * 0.04, 0.1);

    // blinking (rings squash vertically)
    if (blinkT < 0 && t > nextBlink && current !== "thinking") {
      blinkT = 0;
      nextBlink = t + 2.5 + Math.random() * 4;
    }
    let blink = 1;
    if (blinkT >= 0) {
      blinkT += dt * 7;
      blink = Math.abs(Math.cos(Math.min(blinkT, Math.PI)));
      if (blinkT >= Math.PI) { blinkT = -1; if (Math.random() < 0.25) nextBlink = t + 0.16; } // sometimes double-blink
    }
    const happy = (waveT >= 0 || pokeT >= 0) ? 0.5 : 1;
    const eyeBase = current === "listening" ? 1.16 : 1.0;
    eyeMeshes.forEach((e, i) => {
      e.scale.y = Math.max(0.08, blink * eyeBase * happy);
      e.scale.x = eyeBase;
      eyeGlows[i].material.opacity = 0.55 * blink;
    });

    // gentle glow pulse (eyes + chest), stronger while listening
    const pulse = 1 + Math.sin(t * (current === "listening" ? 5 : 2.4)) * (current === "listening" ? 0.5 : 0.25);
    eyeMat.emissiveIntensity = 1.5 * pulse;
    chestMat.emissiveIntensity = 1.2 * pulse;
    chestGlow.material.opacity = 0.5 + Math.sin(t * 2.4) * 0.2;

    // listening ripple
    if (current === "listening") {
      const p = (t * 0.8) % 1;
      ripple.scale.setScalar(0.6 + p * 0.9);
      ripple.material.opacity = 0.5 * (1 - p);
    } else {
      ripple.material.opacity = lerp(ripple.material.opacity, 0, 0.2);
    }

    // smile: opens/talks while speaking, widens a touch when happy
    let smileSy = 1, smileSx = 1;
    if (current === "speaking") smileSy = 1 + Math.abs(Math.sin(t * 12)) * 0.9;
    if (waveT >= 0 || pokeT >= 0) smileSx = 1.15;
    smileGroup.scale.y = lerp(smileGroup.scale.y, smileSy, 0.4);
    smileGroup.scale.x = lerp(smileGroup.scale.x, smileSx, 0.2);

    // cheeks brighten a bit while speaking
    cheekMat.emissiveIntensity = lerp(cheekMat.emissiveIntensity, current === "speaking" ? 1.3 : 0.9, 0.1);

    // thinking dots orbit
    if (thinkDots.visible) {
      dots.forEach((d, i) => {
        const a = t * 2 + i * 2.1;
        d.position.set(Math.cos(a) * (0.25 + i * 0.12), Math.sin(t * 4 + i) * 0.06, Math.sin(a) * 0.15);
      });
    }

    // arms: gentle idle sway, speaking gestures, and a big greeting wave
    armPivots.forEach((pivot, i) => {
      const rest = armRest[i];
      const phase = i === 0 ? 0 : Math.PI;
      let target = rest + Math.sin(t * 1.6 + phase) * 0.05; // gentle symmetric sway
      if (current === "speaking") target = rest + Math.sin(t * 6 + phase) * 0.3;
      if (waveT >= 0 && i === 1) target = 1.9 + Math.sin(waveT * 11) * 0.28; // right-arm wave
      pivot.rotation.z = lerp(pivot.rotation.z, target, 0.2);
    });
    if (waveT >= 0) { waveT += dt; if (waveT > 1.9) waveT = -1; }

    // poke bounce (squash & stretch)
    if (pokeT >= 0) {
      pokeT += dt * 1.7;
      const decay = Math.max(0, 1 - pokeT);
      const wob = Math.sin(pokeT * Math.PI * 4) * 0.12 * decay;
      robot.scale.set(1 - wob * 0.5, 1 + wob, 1 - wob * 0.5);
      if (pokeT > 1) { pokeT = -1; robot.scale.set(1, 1, 1); }
    }

    renderer.render(scene, camera);
  }

  // ---- Resize ----------------------------------------------------------
  function resize() {
    const w = container.clientWidth || 640;
    const h = container.clientHeight || 400;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(resize).observe(container);
  window.__robo = { scene, camera, renderer, resize };

  // ---- Pointer ---------------------------------------------------------
  const el = renderer.domElement;
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", (e) => {
    dragging = true; moved = false;
    lastX = downX = e.clientX; lastY = downY = e.clientY;
    spinVel = 0; pitchVel = 0;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    pointerOver = true;
    const r = el.getBoundingClientRect();
    look.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.9;
    look.ty = ((e.clientY - r.top) / r.height - 0.5) * 0.6;
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      spin += dx * 0.01; spinVel = dx * 0.01;
      pitch += dy * 0.009; pitchVel = dy * 0.009;
      pitch = clamp(pitch, -1.2, 1.3);
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) moved = true;
    }
  });
  el.addEventListener("pointerup", () => {
    dragging = false;
    if (!moved) react("poke");
  });
  el.addEventListener("pointerleave", () => { dragging = false; pointerOver = false; });

  // ---- Go --------------------------------------------------------------
  resize();
  setTimeout(resize, 60);
  setTimeout(resize, 300);
  animate();

  return {
    set, wave, react,
    startTalking() { set("speaking"); },
    stopTalking() { if (current === "speaking") set("idle"); },
    get state() { return current; },
  };
})();

window.Robot = Robot;
