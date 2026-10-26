/**
 * The black hole, as one fragment shader.
 *
 * Every pixel fires a ray from the camera and bends it step by step around
 * the hole, the way light does near a mass: the Schwarzschild null geodesic
 * written as an acceleration, a = −(3/2)·h²·x/r⁵ (h = |x × v|, r_s = 1),
 * plus a Lense–Thirring term that twists the ray with the spin. That twist
 * is what makes this a rotating (Kerr-like) hole instead of a still one: the
 * shadow flattens on one side and the disk image goes lopsided. It is not a
 * full Kerr integrator; it is the cheap, honest approximation of one.
 *
 * Where the ray crosses the equator inside the disk, it picks up light: a
 * thin, turbulent accretion disk whose temperature follows r^(−3/4), whose
 * gas orbits at Keplerian speed, and whose colour and brightness are shifted
 * by Doppler beaming and gravitational redshift (g = δ·√(1 − 1/r), I ∝ g⁴).
 * Because rays keep going after a crossing, the far side of the disk shows up
 * above and below the hole, and a thin photon ring hugs the shadow.
 *
 * Rays that fall through r = 1 are captured (the shadow); rays that escape
 * sample a procedural sky in their final direction, so the stars are lensed
 * for free.
 *
 * Units: r_s = 1, so the photon sphere sits at 1.5 and the disk spans
 * uDisk.x … uDisk.y.
 */

export const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

export const FRAG = `#version 300 es
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamFwd;
uniform float uFov;
uniform vec2 uOffset;
uniform int uSteps;
uniform int uOctaves;
uniform float uSpin;
uniform vec2 uDisk;
uniform float uExposure;
uniform float uWarp;
uniform float uWarpPhase;
uniform float uDive;
uniform float uPixel;

out vec4 outColor;

const float PI = 3.14159265;
const float TAU = 6.2831853;

// ---- hashing and noise ---------------------------------------------------

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1, 0, 0));
  float n010 = hash13(i + vec3(0, 1, 0));
  float n110 = hash13(i + vec3(1, 1, 0));
  float n001 = hash13(i + vec3(0, 0, 1));
  float n101 = hash13(i + vec3(1, 0, 1));
  float n011 = hash13(i + vec3(0, 1, 1));
  float n111 = hash13(i + vec3(1, 1, 1));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= uOctaves) break;
    sum += amp * noise3(p);
    p = p * 2.07 + vec3(1.7, 9.2, 3.1);
    amp *= 0.5;
  }
  return sum;
}

// ---- colour --------------------------------------------------------------

// Black-body colour for a temperature in kelvin (a fit to the Planck locus).
vec3 blackbody(float k) {
  float t = clamp(k, 1000.0, 40000.0) / 100.0;
  float r = t <= 66.0 ? 1.0 : clamp(1.292936 * pow(t - 60.0, -0.1332047), 0.0, 1.0);
  float g = t <= 66.0
    ? clamp(0.3900816 * log(t) - 0.6318414, 0.0, 1.0)
    : clamp(1.1298909 * pow(t - 60.0, -0.0755148), 0.0, 1.0);
  float b = t >= 66.0 ? 1.0 : (t <= 19.0 ? 0.0 : clamp(0.5432068 * log(t - 10.0) - 1.1962541, 0.0, 1.0));
  return vec3(r, g, b);
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

// ---- sky -----------------------------------------------------------------

vec3 starLayer(vec3 d, float scale, float keep, float gain) {
  vec3 p = d * scale;
  vec3 id = floor(p);
  vec3 f = fract(p) - 0.5;
  float h = hash13(id + 17.0);
  if (h > keep) return vec3(0.0);
  vec3 off = (hash33(id) - 0.5) * 0.6;
  float dist = length(f - off);
  // Never thinner than a pixel, so stars do not shimmer as the camera moves.
  float radius = max(uPixel * scale * 0.9, 0.035);
  float core = smoothstep(radius, 0.0, dist);
  float temp = mix(3200.0, 11000.0, hash11(h * 91.0));
  float bright = gain * (0.35 + 1.4 * pow(hash11(h * 47.0), 3.0));
  return blackbody(temp) * core * bright;
}

vec3 sky(vec3 d) {
  vec3 col = starLayer(d, 48.0, 0.07, 1.7);
  col += starLayer(d, 120.0, 0.06, 0.8);
  col += starLayer(d, 260.0, 0.05, 0.4);
  // A faint galactic band, tilted against the disk.
  vec3 bandN = normalize(vec3(0.25, 0.92, 0.3));
  float band = exp(-pow(dot(d, bandN), 2.0) * 9.0);
  float dust = fbm(d * 3.2 + 4.0);
  vec3 neb = mix(vec3(0.10, 0.06, 0.16), vec3(0.05, 0.10, 0.14), dust);
  col += neb * band * (0.35 + 0.9 * dust) * 0.55;
  return col;
}

// ---- accretion disk -------------------------------------------------------

// Turbulence that orbits at the Keplerian rate without winding up forever:
// two copies of the pattern, each reset on its own half-period, crossfaded.
float diskDensity(float r, float ang) {
  float omega = 0.7071 / pow(r, 1.5);
  float period = 18.0;
  float t = uTime * 0.6;
  float p1 = fract(t / period);
  float p2 = fract(t / period + 0.5);
  float w = abs(p1 * 2.0 - 1.0);
  float a1 = ang - omega * p1 * period * 3.0;
  float a2 = ang - omega * p2 * period * 3.0;
  // Angle enters through cos/sin at a small radius and r at a high frequency,
  // so features stretch along the orbit into streaks.
  float n1 = fbm(vec3(cos(a1) * 2.6, sin(a1) * 2.6, r * 4.2));
  float n2 = fbm(vec3(cos(a2) * 2.6, sin(a2) * 2.6, r * 4.2 + 11.0));
  return mix(n1, n2, w);
}

vec4 disk(vec3 p, vec3 dir) {
  float r = length(p.xz);
  float rin = uDisk.x;
  float rout = uDisk.y;
  float x = (r - rin) / (rout - rin);
  float ang = atan(p.z, p.x);

  float n = diskDensity(r, ang);
  float edge = smoothstep(0.0, 0.025, x) * (1.0 - smoothstep(0.35, 1.0, x));
  float density = edge * smoothstep(0.18, 0.78, n);

  // Thin-disk temperature profile (Shakura–Sunyaev, simplified): hottest
  // just outside the inner edge, falling as r^(−3/4).
  float prof = pow(rin / r, 0.75) * pow(max(1.0 - sqrt(rin / r) * 0.82, 0.0), 0.25);
  float temp = 7400.0 * prof;

  // Doppler beaming: the gas on one side comes at us, on the other it leaves.
  float beta = clamp(sqrt(0.5 / max(r - 1.0, 0.05)), 0.0, 0.9);
  vec3 orbit = normalize(vec3(-p.z, 0.0, p.x));
  float cosT = dot(orbit, -dir);
  float gamma = 1.0 / sqrt(1.0 - beta * beta);
  float delta = 1.0 / (gamma * (1.0 - beta * cosT));
  float grav = sqrt(max(1.0 - 1.0 / r, 0.02));
  float g = delta * grav;

  vec3 col = blackbody(temp * g) * pow(g, 3.0) * prof * 4.2;
  // Hot filaments burn brighter than the gas around them.
  col *= 0.45 + 1.6 * density * density;
  return vec4(col, clamp(density * 1.25, 0.0, 1.0));
}

// ---- warp ------------------------------------------------------------------

float streakSet(vec2 uv, float lanes, float seed, float len) {
  float cell = (atan(uv.y, uv.x) / TAU + 0.5) * lanes;
  float rad = length(uv);
  float lane = floor(cell);
  float h = hash11(lane * 1.31 + seed);
  float h2 = hash11(lane * 7.17 + seed * 3.0);
  float h3 = hash11(lane * 3.71 + seed * 5.0);
  // Each lane carries one star rushing at the camera: depth 1 is far (near
  // the centre), depth 0 is passing us (at the edge). Projected radius is
  // k/depth; the streak is where it was a moment ago, k/(depth + len).
  float depth = max(fract(h - uWarpPhase * (0.5 + 0.7 * h2)), 0.015);
  float head = 0.05 / depth;
  float tail = 0.05 / (depth + len);
  float along = smoothstep(tail, mix(tail, head, 0.7), rad) * (1.0 - smoothstep(head, head * 1.04, rad));
  float perp = abs(fract(cell) - (0.2 + 0.6 * h3)) / lanes * TAU * rad;
  float width = 0.0009 + 0.0035 * (1.0 - depth);
  float line = smoothstep(width, 0.0, perp);
  float near = 1.0 - depth;
  return along * line * near * near * (0.45 + 0.55 * h2);
}

vec3 warpField(vec2 uv) {
  float len = 0.02 + 0.3 * uWarp;
  vec3 c;
  // Chromatic aberration: each channel sees the streaks at a slightly
  // different radius, so they fringe red outside and blue inside.
  for (int k = 0; k < 3; k++) {
    float s = 1.0 + (float(k) - 1.0) * 0.035 * uWarp;
    vec2 q = uv * s;
    float v = streakSet(q, 170.0, 3.0, len) + streakSet(q, 290.0, 9.0, len) * 0.8;
    if (k == 0) c.r = v;
    else if (k == 1) c.g = v;
    else c.b = v;
  }
  float rad = length(uv);
  // Ahead, starlight is blue-shifted; out at the edge, it reddens.
  vec3 tint = mix(vec3(0.7, 0.85, 1.25), vec3(1.2, 0.85, 0.65), smoothstep(0.15, 1.0, rad));
  vec3 core = vec3(0.4, 0.55, 1.0) * exp(-rad * 7.0) * 0.55;
  return c * tint * 2.4 + core * uWarp;
}

// ---- trace -----------------------------------------------------------------

vec3 trace(vec3 ro, vec3 rd) {
  vec3 pos = ro;
  vec3 vel = rd;
  vec3 hv = cross(pos, vel);
  float h2 = dot(hv, hv);
  vec3 col = vec3(0.0);
  float alpha = 0.0;
  float ring = 0.0;
  float rCam = length(ro);

  // Far from the hole and aimed well wide of the disk: bend analytically
  // (weak-field deflection 2r_s/b) and skip the march.
  float b = sqrt(h2);
  if (b > uDisk.y + 3.0 && rCam > uDisk.y + 3.0) {
    vec3 toward = normalize(-ro - rd * dot(-ro, rd));
    vec3 d = normalize(rd + toward * (2.0 / b));
    return sky(d);
  }

  bool captured = false;
  float escape = max(rCam * 1.02, 26.0);
  for (int i = 0; i < 400; i++) {
    if (i >= uSteps) break;
    float r2 = dot(pos, pos);
    float r = sqrt(r2);
    if (r < 1.0) { captured = true; break; }
    if (r > escape && dot(pos, vel) > 0.0) break;

    float dt = clamp(0.075 * r * (r - 0.85), 0.012, 2.5);
    vec3 prev = pos;

    // Leapfrog: half kick, drift, half kick.
    vec3 acc = -1.5 * h2 * pos / (r2 * r2 * r);
    vel += acc * dt * 0.5;
    // Frame dragging: the spin twists the ray's direction around the axis.
    float drag = 0.28 * uSpin / (r2 * r);
    vel += cross(vec3(0.0, -drag, 0.0), vel) * dt;
    pos += vel * dt;
    r2 = dot(pos, pos);
    r = sqrt(r2);
    acc = -1.5 * h2 * pos / (r2 * r2 * r);
    vel += acc * dt * 0.5;

    // A faint glow where light skims the photon sphere.
    ring += exp(-abs(r - 1.5) * 10.0) * dt;

    if (prev.y * pos.y < 0.0) {
      vec3 hit = mix(prev, pos, prev.y / (prev.y - pos.y));
      float rh = length(hit.xz);
      if (rh > uDisk.x && rh < uDisk.y) {
        vec4 d = disk(hit, normalize(vel));
        col += (1.0 - alpha) * d.rgb * d.a;
        alpha += (1.0 - alpha) * d.a;
        if (alpha > 0.97) break;
      }
    }
  }

  vec3 back = vec3(0.0);
  if (!captured) {
    // The march stops at a finite radius; add the bending still to come
    // (weak field, (r_s/b)(1 − cos ψ)) so the sky has no seams.
    vec3 dir = normalize(vel);
    vec3 radial = normalize(pos);
    float rest = (1.0 / max(sqrt(h2), 1.0)) * (1.0 - dot(radial, dir));
    vec3 perp = radial - dir * dot(radial, dir);
    vec3 toward = dot(perp, perp) > 1e-8 ? -normalize(perp) : vec3(0.0);
    back = sky(normalize(dir + toward * rest));
  }
  col += (1.0 - alpha) * back;
  col += vec3(1.0, 0.62, 0.32) * ring * 0.035 * (1.0 - alpha);
  return col;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = (frag - 0.5 * uRes) / uRes.y;
  vec2 screen = uv;
  uv -= uOffset;

  // Crossing the horizon: the picture stretches along one axis and twists.
  float dive = uDive;
  if (dive > 0.0) {
    float rr = length(uv);
    float tw = dive * dive * 2.2 * exp(-rr * 1.2);
    float c = cos(tw), s = sin(tw);
    uv = mat2(c, -s, s, c) * uv;
    uv *= vec2(1.0 + 0.35 * dive, 1.0 - 0.55 * dive * dive);
  }

  vec3 col = vec3(0.0);
  if (uWarp < 0.995) {
    vec3 rd = normalize(uCamFwd + (uv.x * uCamRight + uv.y * uCamUp) * uFov);
    col = trace(uCamPos, rd) * (1.0 - uWarp);
  }
  if (uWarp > 0.0) {
    col += warpField(screen) * smoothstep(0.0, 0.35, uWarp);
  }

  col *= uExposure;

  // Past the horizon: the light of everything that fell in before you.
  float white = smoothstep(0.82, 1.0, dive);
  col = mix(col, vec3(1.6, 1.5, 1.35), white);

  // Mild saturation boost before the tone curve, which washes highlights.
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(lum), col, 1.2), 0.0);
  outColor = vec4(aces(col), 1.0);
}
`

/**
 * Bloom: a separable Gaussian (9 taps folded into 5 bilinear reads) run at a
 * quarter of the scene's resolution. The first pass also keeps only what is
 * bright, so the glow comes from the disk and the photon ring, not the sky.
 */
export const BLUR = `#version 300 es
precision mediump float;
uniform sampler2D uTex;
uniform vec2 uStep;
uniform vec2 uOut;
uniform float uBright;
out vec4 outColor;

vec3 pick(vec2 uv) {
  vec3 c = texture(uTex, uv).rgb;
  if (uBright > 0.5) {
    float l = max(c.r, max(c.g, c.b));
    c *= smoothstep(0.5, 0.95, l);
  }
  return c;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec3 c = pick(uv) * 0.2270270;
  c += (pick(uv + uStep * 1.3846154) + pick(uv - uStep * 1.3846154)) * 0.3162162;
  c += (pick(uv + uStep * 3.2307692) + pick(uv - uStep * 3.2307692)) * 0.0702703;
  outColor = vec4(c, 1.0);
}
`

/**
 * The final image: the scene upscaled to the canvas, plus bloom, plus a
 * radial chromatic aberration that grows during the warp and the dive, a
 * vignette, and a dither so the dark gradients never band.
 */
export const COMPOSITE = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2 uRes;
uniform float uAberration;
uniform float uBloomGain;
uniform float uTime;
out vec4 outColor;

float hash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 c = uv - 0.5;
  vec2 shift = c * uAberration * (0.35 + length(c) * 1.6);
  vec3 col;
  col.r = texture(uScene, uv + shift).r;
  col.g = texture(uScene, uv).g;
  col.b = texture(uScene, uv - shift).b;
  vec3 bloom = texture(uBloom, uv).rgb;
  col = min(col + bloom * uBloomGain, vec3(1.0));
  float aspect = uRes.x / uRes.y;
  float v = smoothstep(0.45, 1.05, length(c * vec2(aspect, 1.0) * 0.95));
  col *= 1.0 - v * 0.45;
  col += (hash(vec3(gl_FragCoord.xy, uTime * 60.0)) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}
`
