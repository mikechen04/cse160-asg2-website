/*
python3 -m http.server 

Site link: [Your site link here]
*/

var VSHADER_SOURCE =
  `
  attribute vec4 a_Position;
  uniform float u_Size;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
  gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  gl_PointSize = u_Size;
  }
  `

// Fragment shader program
var FSHADER_SOURCE =
  `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
  `

let canvas;
let gl;
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5.0;
let g_selectedType = 0; // 0 for POINT, 1 for TRIANGLE, 2 for CIRCLE, 3 for PAINT
let g_selectedSegments = 20; // Number of segments for circles
let g_lastPaintPos = null; // Last position for paint stroke
let g_isPainting = false; // Whether currently painting
let a_Position;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let g_cameraAngle = 5;
let g_sheepTilt = -20;
let g_tailAngle = 0;
let g_thighAngle = 0;
let g_calfAngle = 0;
let g_pokeAnimation = false;
let g_pokeAnimationStart = 0;
let g_pokeAnimationDuration = 2.0;
let g_pokeProgress = 0;
let g_walkAnimation = true;
let g_isDrag = false;
let g_xPrev = 0;
let g_yPrev = 0;
let g_angleSlideEl = null;
let g_sheepTiltSlideEl = null;
let g_instructionsEl = null;
let g_instructionsSet = false;

function setupWebGL() {
  canvas = document.getElementById('webgl');
  if (!canvas) {
    console.log('Failed to get the canvas element');
    return false;
  }

  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, depth: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return false;
  }
  return true;
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return false;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return false;
  }

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return false;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return false;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return false;
  }

  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return false;
  }
  return true;
}

function drawCube(M) {
  var cube = new Cube();
  cube.matrix = new Matrix4(M);
  cube.color = [1.0, 1.0, 1.0, 1.0]; // Default white color
  cube.render();
}

function addActionsForHtmlUI(){
  g_angleSlideEl = document.getElementById('AngleSlide');
  if (g_angleSlideEl) g_angleSlideEl.addEventListener('mousemove', function() { 
    g_cameraAngle = this.value;
    renderAllShapes();
  });

  g_sheepTiltSlideEl = document.getElementById('sheepTiltSlide');
  if (g_sheepTiltSlideEl) {
    g_sheepTiltSlideEl.oninput = function() { 
      g_sheepTilt = parseFloat(this.value);
      renderAllShapes();
    };
  }

  var tailSlide = document.getElementById('tailSlide');
  if (tailSlide) {
    tailSlide.addEventListener('input', function() {
      g_tailAngle = parseFloat(this.value);
      renderAllShapes();
    });
  }

  var thighSlide = document.getElementById('thighSlide');
  if (thighSlide) {
    thighSlide.addEventListener('input', function() {
      g_thighAngle = parseFloat(this.value);
      renderAllShapes();
    });
  }

  var calfSlide = document.getElementById('calfSlide');
  if (calfSlide) {
    calfSlide.addEventListener('input', function() {
      g_calfAngle = parseFloat(this.value);
      renderAllShapes();
    });
  }
  
  g_instructionsEl = document.getElementById('instructions');
  
  var walkOnBtn = document.getElementById('walkOnButton');
  if (walkOnBtn) {
    walkOnBtn.addEventListener('click', function() {
      g_walkAnimation = true;
      renderAllShapes();
    });
  }

  var walkOffBtn = document.getElementById('walkOffButton');
  if (walkOffBtn) {
    walkOffBtn.addEventListener('click', function() {
      g_walkAnimation = false;
      renderAllShapes();
    });
  }

  if (canvas) {
    canvas.addEventListener('mousedown', function(ev) {
      if (ev.shiftKey) {
        g_isDrag = false;
        g_pokeAnimation = true;
        g_pokeAnimationStart = performance.now() / 1000;
        renderAllShapes();
        return;
      }
      g_isDrag = true;
      g_xPrev = ev.clientX;
      g_yPrev = ev.clientY;
    });

    canvas.addEventListener('mouseup', function(ev) {
      g_isDrag = false;
    });

    canvas.addEventListener('mouseleave', function(ev) {
      g_isDrag = false;
    });
  }

  window.addEventListener('mousemove', function(ev) {
    if (g_pokeAnimation || !g_isDrag || ev.shiftKey) {
      g_isDrag = false;
      return;
    }
    var dx = ev.clientX - g_xPrev;
    var dy = ev.clientY - g_yPrev;
    g_cameraAngle = Math.max(0, Math.min(90, g_cameraAngle - dx * 0.3));
    g_sheepTilt = Math.max(-45, Math.min(45, g_sheepTilt - dy * 0.3));
    if (g_angleSlideEl) g_angleSlideEl.value = g_cameraAngle;
    if (g_sheepTiltSlideEl) g_sheepTiltSlideEl.value = g_sheepTilt;
    g_xPrev = ev.clientX;
    g_yPrev = ev.clientY;
    renderAllShapes();
  });
} 

function main() {

  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearDepth(1.0);

  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) { 
    if (ev.buttons == 1) click(ev); 
  };
  canvas.onmouseup = function(ev) {
    if (g_selectedType == PAINT) {
      g_isPainting = false;
      g_lastPaintPos = null;
    }
  };
  canvas.onmouseleave = function(ev) {
    if (g_selectedType == PAINT) {
      g_isPainting = false;
      g_lastPaintPos = null;
    }
  };

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  renderAllShapes();
  requestAnimationFrame(tick);
}

var g_shapesList = [];

function click(ev) {
  let [x,y] = convertCoordinatesEventToGL(ev);
  if (g_selectedType == PAINT) {
    if (!g_isPainting) {
      g_isPainting = true;
      g_lastPaintPos = [x, y];
      let point = new Point();
      point.position = [x, y, 0.0];
      point.color = g_selectedColor.slice();
      point.size = g_selectedSize;
      g_shapesList.push(point);
      renderAllShapes();
    } else {
      drawPaintStroke(g_lastPaintPos[0], g_lastPaintPos[1], x, y);
      g_lastPaintPos = [x, y];
    }
    return;
  }
  g_isPainting = false;
  g_lastPaintPos = null;
  let point = g_selectedType == POINT ? new Point() :
              g_selectedType == TRIANGLE ? new Triangle() :
              g_selectedType == CIRCLE ? (() => { let c = new Circle(); c.segments = g_selectedSegments; return c; })() :
              new Point();
  point.position = [x, y, 0.0];
  point.color = g_selectedColor.slice();
  point.size = g_selectedSize;
  g_shapesList.push(point);
  renderAllShapes();
}

function drawPaintStroke(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const numPoints = Math.max(2, Math.ceil(distance * 50));
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    let point = new Point();
    point.position = [x1 + dx * t, y1 + dy * t, 0.0];
    point.color = g_selectedColor.slice();
    point.size = g_selectedSize;
    g_shapesList.push(point);
  }
  renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
  var rect = ev.target.getBoundingClientRect();
  var x = ((ev.clientX - rect.left) - canvas.width/2)/(canvas.width/2);
  var y = (canvas.height/2 - (ev.clientY - rect.top))/(canvas.height/2);
  return [x, y];
}

var g_startTime = performance.now() / 1000;
function tick(){
  updateAnimationAngles();
  renderAllShapes();
  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  if (g_pokeAnimation) {
    let t = (performance.now() / 1000) - g_pokeAnimationStart;
    g_pokeProgress = Math.min(t / g_pokeAnimationDuration, 1);

    if (g_pokeProgress >= 1) {
      g_pokeAnimation = false;
      g_pokeProgress = 0;
    }
  }
}

function renderAllShapes() {
  var startTime = performance.now();
  var g_seconds = (performance.now() / 1000) - g_startTime;
  let walkTime = g_seconds * 4; // speed of walking
  var globalRotMat = new Matrix4();
  globalRotMat.rotate(g_cameraAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Base values
  let tiltAngle = g_sheepTilt;
  let bodyCenterY = -0.3;

  // Poke animation effect
  if (g_pokeAnimation) {
    tiltAngle += 25 * Math.sin(g_pokeProgress * Math.PI); // lean back
    bodyCenterY += 0.15 * Math.sin(g_pokeProgress * Math.PI); // lift body
  }
  
  function applyTiltRotation(cube, partX, partY, partZ) {
    cube.matrix.translate(0, bodyCenterY, 0);
    cube.matrix.rotate(tiltAngle, 1, 0, 0);
    cube.matrix.translate(0, -bodyCenterY, 0);
    cube.matrix.translate(partX, partY, partZ);
  }
  
  var body = new Cube();
  body.color = [1.0, 1.0, 1.0, 1.0];
  applyTiltRotation(body, 0, bodyCenterY, 0.0);
  body.matrix.scale(0.6, 0.4, 0.5);
  body.render();

  var head = new Cube();
  head.color = [1.0, 1.0, 1.0, 1.0];
  applyTiltRotation(head, 0.0, -0.1, -0.28);
  // Head swing side to side during walking (rotate around head center)
  if (g_walkAnimation && !g_pokeAnimation) {
    head.matrix.translate(0.0, 0.1, 0.28); // Move head center to origin
    head.matrix.rotate(5 * Math.sin(walkTime), 0, 1, 0); // Rotate ±5 degrees
    head.matrix.translate(0.0, -0.1, -0.28); // Move back to position
  }
  head.matrix.scale(0.3, 0.3, 0.3);
  head.render();

  var leftEye = new Cube();
  leftEye.color = [0.0, 0.0, 0.0, 1.0];
  applyTiltRotation(leftEye, -0.08, -0.05, -0.46);
  // Eyes follow head rotation during walking
  if (g_walkAnimation && !g_pokeAnimation) {
    leftEye.matrix.translate(0.0, 0.1, 0.28); // Move to head center
    leftEye.matrix.rotate(5 * Math.sin(walkTime), 0, 1, 0); // Rotate ±5 degrees
    leftEye.matrix.translate(0.0, -0.1, -0.28); // Move back
  }
  leftEye.matrix.scale(0.04, 0.04, 0.02);
  leftEye.render();

  var rightEye = new Cube();
  rightEye.color = [0.0, 0.0, 0.0, 1.0];
  applyTiltRotation(rightEye, 0.08, -0.05, -0.46);
  // Eyes follow head rotation during walking
  if (g_walkAnimation && !g_pokeAnimation) {
    rightEye.matrix.translate(0.0, 0.1, 0.28); // Move to head center
    rightEye.matrix.rotate(5 * Math.sin(walkTime), 0, 1, 0); // Rotate ±5 degrees
    rightEye.matrix.translate(0.0, -0.1, -0.28); // Move back
  }
  rightEye.matrix.scale(0.04, 0.04, 0.02);
  rightEye.render();

  function renderHierarchicalLeg(baseX, baseY, baseZ, legSide) {
    const isFront = baseZ < 0;

    // ----- WALK PHASE (diagonal pairing) -----
    let phase = walkTime;

    if (
      (baseX > 0 && baseZ < 0) || // front-right
      (baseX < 0 && baseZ > 0)    // back-left
    ) {
      phase += Math.PI;
    }

    let walkSwing = g_walkAnimation && !g_pokeAnimation
      ? Math.sin(phase)
      : 0;

    let walkLift = g_walkAnimation && !g_pokeAnimation
      ? Math.max(0, Math.sin(phase))
      : 0;

    // ----- POKE OVERRIDES (front legs only) -----
    let armSwing = 0;
    if (g_pokeAnimation && isFront) {
      armSwing =
        Math.sin(g_pokeProgress * Math.PI * 2) *
        80 *
        (legSide > 0 ? 1 : -1);
    }

    // ----- FINAL JOINT ANGLES -----
    let thighAngle = g_pokeAnimation && isFront
      ? armSwing
      : (g_walkAnimation && !g_pokeAnimation ? (isFront ? 35 : 25) * walkSwing : 0) + g_thighAngle;

    let calfAngle = g_pokeAnimation
      ? 0
      : (g_walkAnimation && !g_pokeAnimation ? (isFront ? -40 : -25) * walkLift : 0) + g_calfAngle;

    // -------- THIGH --------
    let thigh = new Cube();
    thigh.color = [0.2, 0.2, 0.2, 1];
    applyTiltRotation(thigh, baseX, baseY, baseZ);

    thigh.matrix.translate(0, 0.1, 0);
    thigh.matrix.rotate(thighAngle, 1, 0, 0);
    thigh.matrix.translate(0, -0.1, 0);

    let thighMatrix = new Matrix4(thigh.matrix);
    thigh.matrix.scale(0.12, 0.1, 0.12);
    thigh.render();

    // -------- CALF --------
    let calf = new Cube();
    calf.color = [0.25, 0.25, 0.25, 1];
    calf.matrix = new Matrix4(thighMatrix);

    calf.matrix.translate(0, -0.1, 0);
    calf.matrix.rotate(calfAngle, 1, 0, 0);

    let calfMatrix = new Matrix4(calf.matrix);
    calf.matrix.scale(0.1, 0.08, 0.1);
    calf.render();

    // -------- FOOT --------
    let foot = new Cube();
    foot.color = [0.15, 0.15, 0.15, 1];
    foot.matrix = new Matrix4(calfMatrix);

    foot.matrix.translate(0, -0.08, 0);
    foot.matrix.scale(0.12, 0.06, 0.12);
    foot.render();
  }
  
  renderHierarchicalLeg(0.15, -0.45, -0.18, 1);
  renderHierarchicalLeg(-0.15, -0.45, -0.18, -1);
  renderHierarchicalLeg(0.15, -0.45, 0.18, 1);
  renderHierarchicalLeg(-0.15, -0.45, 0.18, -1);

  var tail = new Cube();
  tail.color = [1.0, 1.0, 1.0, 1.0];
  applyTiltRotation(tail, 0.0, -0.1, 0.22);
  tail.matrix.rotate(g_tailAngle, 0, 1, 0);
  tail.matrix.scale(0.1, 0.15, 0.1);
  tail.render();

  var leftEar = new Cylinder();
  leftEar.color = [0.8, 0.7, 0.6, 1.0];
  applyTiltRotation(leftEar, 0.1, 0.05, -0.38);
  // Ears follow head rotation during walking
  if (g_walkAnimation && !g_pokeAnimation) {
    leftEar.matrix.translate(0.0, 0.1, 0.28); // Move to head center
    leftEar.matrix.rotate(5 * Math.sin(walkTime), 0, 1, 0); // Rotate ±5 degrees
    leftEar.matrix.translate(0.0, -0.1, -0.28); // Move back
  }
  leftEar.matrix.rotate(15, 0, 0, 1);
  leftEar.matrix.scale(0.06, 0.12, 0.04);
  leftEar.render();

  var rightEar = new Cylinder();
  rightEar.color = [0.8, 0.7, 0.6, 1.0];
  applyTiltRotation(rightEar, -0.1, 0.05, -0.38);
  // Ears follow head rotation during walking
  if (g_walkAnimation && !g_pokeAnimation) {
    rightEar.matrix.translate(0.0, 0.1, 0.28); // Move to head center
    rightEar.matrix.rotate(5 * Math.sin(walkTime), 0, 1, 0); // Rotate ±5 degrees
    rightEar.matrix.translate(0.0, -0.1, -0.28); // Move back
  }
  rightEar.matrix.rotate(-15, 0, 0, 1);
  rightEar.matrix.scale(0.06, 0.12, 0.04);
  rightEar.render();

  var duration = performance.now() - startTime;
  sendTextToHTML("ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration), "numdot");
  if (!g_instructionsSet && g_instructionsEl) {
    g_instructionsEl.innerHTML = "drag on canvas to rotate the sheep. shift + click for it's animation.";
    g_instructionsSet = true;
  }
}

function sendTextToHTML(text, htmlID) {
  if (!htmlID) {
    console.log("sendTextToHTML: htmlID parameter is required");
    return;
  }
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}