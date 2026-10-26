import { BLUR, COMPOSITE, FRAG, VERT } from './shader'

/**
 * The renderer around the shaders, in raw WebGL2 (three.js would be 150 KB to
 * draw a few full-screen triangles). Each frame:
 *
 *   1. the ray march draws the scene into a texture, below canvas resolution;
 *   2. its bright parts are blurred at a quarter of that, twice, for bloom;
 *   3. a composite pass upscales the scene to the canvas and adds the bloom,
 *      chromatic aberration, a vignette and dither.
 *
 * Quality adapts twice. Up front, from the GPU the browser reports and the
 * kind of device, it picks a render scale, a step budget for the march and
 * the octaves of the disk turbulence. Then, every half second, it looks at
 * the frame times: sustained slow frames lower the render scale, and once
 * that hits its floor, the steps and octaves; sustained fast frames buy the
 * resolution back.
 */

export interface View {
  readonly camR: number
  readonly theta: number
  readonly phi: number
  readonly roll: number
  /** Turn the camera away from the hole (radians, towards its right). */
  readonly yaw: number
  readonly fov: number
  readonly offX: number
  readonly offY: number
  readonly warp: number
  readonly warpPhase: number
  readonly dive: number
  readonly exposure: number
}

export type Tier = 'still' | 'low' | 'mid' | 'high'

export interface Quality {
  readonly scale: number
  readonly steps: number
  readonly octaves: number
  readonly fps: number
  readonly tier: Tier
}

export interface BlackHole {
  draw(view: View, time: number, dt: number): void
  quality(): Quality
  destroy(): void
}

interface Budget {
  scale: number
  maxScale: number
  minScale: number
  steps: number
  minSteps: number
  octaves: number
}

const BUDGETS: Record<Tier, Budget> = {
  // One frame, drawn when the chapter changes: spend everything on it.
  still: {
    scale: 1,
    maxScale: 1,
    minScale: 1,
    steps: 320,
    minSteps: 320,
    octaves: 5,
  },
  high: {
    scale: 0.8,
    maxScale: 1,
    minScale: 0.4,
    steps: 220,
    minSteps: 100,
    octaves: 4,
  },
  mid: {
    scale: 0.6,
    maxScale: 0.8,
    minScale: 0.35,
    steps: 170,
    minSteps: 90,
    octaves: 4,
  },
  low: {
    scale: 0.45,
    maxScale: 0.6,
    minScale: 0.3,
    steps: 130,
    minSteps: 80,
    octaves: 3,
  },
}

/** Read the GPU name where the browser allows it; guess the tier from it. */
function detectTier(gl: WebGL2RenderingContext, phone: boolean): Tier {
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const name: unknown = info
    ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
    : gl.getParameter(gl.RENDERER)
  const gpu = String(name).toLowerCase()
  if (/swiftshader|llvmpipe|software|basic render/.test(gpu)) return 'low'
  if (phone) return 'low'
  if (/nvidia|geforce|rtx|radeon rx|apple/.test(gpu)) return 'high'
  return 'mid'
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('shader')
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(shader) ?? 'shader')
  return shader
}

function link(gl: WebGL2RenderingContext, frag: string) {
  const program = gl.createProgram()
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT))
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, frag))
  gl.bindAttribLocation(program, 0, 'aPos')
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program) ?? 'link')
  return program
}

function uniforms<K extends string>(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  names: readonly K[],
) {
  return Object.fromEntries(
    names.map((name) => [name, gl.getUniformLocation(program, name)]),
  ) as Record<K, WebGLUniformLocation | null>
}

interface Target {
  tex: WebGLTexture
  fbo: WebGLFramebuffer
  w: number
  h: number
}

function makeTarget(gl: WebGL2RenderingContext): Target {
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const fbo = gl.createFramebuffer()
  return { tex, fbo, w: 0, h: 0 }
}

function sizeTarget(
  gl: WebGL2RenderingContext,
  t: Target,
  w: number,
  h: number,
) {
  if (t.w === w && t.h === h) return
  t.w = w
  t.h = h
  gl.bindTexture(gl.TEXTURE_2D, t.tex)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA8,
    w,
    h,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  )
  gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    t.tex,
    0,
  )
}

export function createBlackHole(
  canvas: HTMLCanvasElement,
  { phone, still }: { phone: boolean; still: boolean },
): BlackHole | null {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: still,
    powerPreference: phone ? 'default' : 'high-performance',
  })
  if (!gl) return null

  let scene: WebGLProgram
  let blur: WebGLProgram
  let composite: WebGLProgram
  try {
    scene = link(gl, FRAG)
    blur = link(gl, BLUR)
    composite = link(gl, COMPOSITE)
  } catch (error) {
    if (import.meta.env.DEV) console.error(error)
    return null
  }

  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  )
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const us = uniforms(gl, scene, [
    'uRes',
    'uTime',
    'uCamPos',
    'uCamRight',
    'uCamUp',
    'uCamFwd',
    'uFov',
    'uOffset',
    'uSteps',
    'uOctaves',
    'uSpin',
    'uDisk',
    'uExposure',
    'uWarp',
    'uWarpPhase',
    'uDive',
    'uPixel',
  ] as const)
  const ub = uniforms(gl, blur, ['uTex', 'uStep', 'uOut', 'uBright'] as const)
  const uc = uniforms(gl, composite, [
    'uScene',
    'uBloom',
    'uRes',
    'uAberration',
    'uBloomGain',
    'uTime',
  ] as const)

  gl.useProgram(scene)
  gl.uniform1f(us.uSpin, 0.94)
  gl.uniform2f(us.uDisk, 1.55, 11.5)
  gl.useProgram(composite)
  gl.uniform1i(uc.uScene, 0)
  gl.uniform1i(uc.uBloom, 1)
  gl.useProgram(blur)
  gl.uniform1i(ub.uTex, 0)

  const sceneTarget = makeTarget(gl)
  const bloomA = makeTarget(gl)
  const bloomB = makeTarget(gl)

  const tier: Tier = still ? 'still' : detectTier(gl, phone)
  const budget = { ...BUDGETS[tier] }
  let avg = 16
  let fps = 60
  let elapsed = 0
  let fast = 0

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    const sw = Math.max(1, Math.round(w * budget.scale))
    const sh = Math.max(1, Math.round(h * budget.scale))
    sizeTarget(gl!, sceneTarget, sw, sh)
    const bw = Math.max(1, Math.round(sw / 4))
    const bh = Math.max(1, Math.round(sh / 4))
    sizeTarget(gl!, bloomA, bw, bh)
    sizeTarget(gl!, bloomB, bw, bh)
  }

  function adapt(dt: number) {
    if (still || dt <= 0 || dt > 0.25) return
    avg += (dt * 1000 - avg) * 0.08
    fps = 1000 / avg
    elapsed += dt
    if (elapsed < 0.5) return
    elapsed = 0
    if (avg > 22) {
      fast = 0
      if (budget.scale > budget.minScale + 0.01) {
        budget.scale = Math.max(budget.minScale, budget.scale * 0.85)
      } else if (budget.steps > budget.minSteps) {
        budget.steps = Math.max(budget.minSteps, budget.steps - 20)
        budget.octaves = Math.max(2, budget.octaves - 1)
      }
    } else if (avg < 13.5) {
      // Only climb back after a couple of seconds of headroom.
      fast++
      if (fast >= 4 && budget.scale < budget.maxScale) {
        budget.scale = Math.min(budget.maxScale, budget.scale * 1.08)
        fast = 0
      }
    } else {
      fast = 0
    }
  }

  function blurPass(
    from: Target,
    to: Target,
    x: number,
    y: number,
    bright: boolean,
  ) {
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, to.fbo)
    gl!.viewport(0, 0, to.w, to.h)
    gl!.bindTexture(gl!.TEXTURE_2D, from.tex)
    gl!.uniform2f(ub.uStep, x / to.w, y / to.h)
    gl!.uniform2f(ub.uOut, to.w, to.h)
    gl!.uniform1f(ub.uBright, bright ? 1 : 0)
    gl!.drawArrays(gl!.TRIANGLES, 0, 3)
  }

  function draw(view: View, time: number, dt: number) {
    adapt(dt)
    resize()
    const g = gl!
    const { camR, theta, phi, roll, yaw } = view
    const st = Math.sin(theta)
    const pos = [
      camR * st * Math.cos(phi),
      camR * Math.cos(theta),
      camR * st * Math.sin(phi),
    ] as const
    const look = [-pos[0] / camR, -pos[1] / camR, -pos[2] / camR] as const
    // right = look × (0, 1, 0), which has no y; up = right × fwd.
    const ll = Math.hypot(look[0], look[2]) || 1
    const lx = -look[2] / ll
    const lz = look[0] / ll
    // Yaw: turn the view away from the hole, around the world's vertical.
    const cy = Math.cos(yaw)
    const sy = Math.sin(yaw)
    const fwd = [
      look[0] * cy + lx * sy,
      look[1],
      look[2] * cy + lz * sy,
    ] as const
    let rx = -fwd[2]
    let rz = fwd[0]
    const rl = Math.hypot(rx, rz) || 1
    rx /= rl
    rz /= rl
    const up = [-rz * fwd[1], rz * fwd[0] - rx * fwd[2], rx * fwd[1]] as const
    // Roll the camera around its forward axis.
    const cr = Math.cos(roll)
    const sr = Math.sin(roll)
    const right = [
      rx * cr + up[0] * sr,
      up[1] * sr,
      rz * cr + up[2] * sr,
    ] as const
    const upR = [
      up[0] * cr - rx * sr,
      up[1] * cr,
      up[2] * cr - rz * sr,
    ] as const

    // 1. The ray march.
    g.bindFramebuffer(g.FRAMEBUFFER, sceneTarget.fbo)
    g.viewport(0, 0, sceneTarget.w, sceneTarget.h)
    g.useProgram(scene)
    g.uniform2f(us.uRes, sceneTarget.w, sceneTarget.h)
    g.uniform1f(us.uTime, time)
    g.uniform3f(us.uCamPos, pos[0], pos[1], pos[2])
    g.uniform3f(us.uCamFwd, fwd[0], fwd[1], fwd[2])
    g.uniform3f(us.uCamRight, right[0], right[1], right[2])
    g.uniform3f(us.uCamUp, upR[0], upR[1], upR[2])
    g.uniform1f(us.uFov, view.fov)
    g.uniform2f(us.uOffset, view.offX, view.offY)
    g.uniform1i(us.uSteps, budget.steps)
    g.uniform1i(us.uOctaves, budget.octaves)
    g.uniform1f(us.uExposure, view.exposure)
    g.uniform1f(us.uWarp, view.warp)
    g.uniform1f(us.uWarpPhase, view.warpPhase)
    g.uniform1f(us.uDive, view.dive)
    g.uniform1f(us.uPixel, (2 * view.fov) / sceneTarget.h)
    g.drawArrays(g.TRIANGLES, 0, 3)

    // 2. Bloom, at a quarter resolution: bright-pass + blur, then blur again.
    g.useProgram(blur)
    g.activeTexture(g.TEXTURE0)
    blurPass(sceneTarget, bloomA, 1, 0, true)
    blurPass(bloomA, bloomB, 0, 1, false)
    blurPass(bloomB, bloomA, 2, 0, false)
    blurPass(bloomA, bloomB, 0, 2, false)

    // 3. Composite to the canvas.
    g.bindFramebuffer(g.FRAMEBUFFER, null)
    g.viewport(0, 0, canvas.width, canvas.height)
    g.useProgram(composite)
    g.activeTexture(g.TEXTURE0)
    g.bindTexture(g.TEXTURE_2D, sceneTarget.tex)
    g.activeTexture(g.TEXTURE1)
    g.bindTexture(g.TEXTURE_2D, bloomB.tex)
    g.uniform2f(uc.uRes, canvas.width, canvas.height)
    g.uniform1f(uc.uAberration, 0.002 + view.warp * 0.012 + view.dive * 0.02)
    g.uniform1f(uc.uBloomGain, 0.85)
    g.uniform1f(uc.uTime, time)
    g.drawArrays(g.TRIANGLES, 0, 3)
    g.activeTexture(g.TEXTURE0)
  }

  return {
    draw,
    quality: () => ({
      scale: budget.scale,
      steps: budget.steps,
      octaves: budget.octaves,
      fps,
      tier,
    }),
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
