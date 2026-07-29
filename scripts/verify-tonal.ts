/**
 * Deterministic checks for the linear-light tonal math.
 * Run: npm run verify:tonal
 *
 * Acceptance criteria (plan stage 2) — each has dedicated hard asserts below:
 * 1. Black stays anchored near 0 after shadows+40 (not lifted)
 * 2. Positive highlights → soft rolloff (decreasing slope), not dead-white plateau
 * 3. Shadow lift preserves hue/saturation of a colored pixel
 * 4. All-zero sliders ≠ identity; output matches base S-curve shape
 */
import {
  NEUTRAL_UNIFORMS,
  applyHighlights,
  applyLumaRatio,
  applyShadows,
  baseSCurve,
  gradePixelLinear,
  hueDeltaDeg,
  lumaOf,
  remapTonal,
  rgbToHsv,
  softShoulder,
  type GradeUniforms,
  type Rgb,
} from '../src/engine/tonalMath'
import { adjustmentsToUniforms, EXPOSURE_STOPS_AT_100 } from '../src/engine/pipeline'
import { neutralAdjustments } from '../src/engine/sliders'

let failed = 0
let passed = 0

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg)
    failed++
  } else {
    console.log('OK  ', msg)
    passed++
  }
}

function approx(a: number, b: number, eps = 1e-4) {
  return Math.abs(a - b) <= eps
}

function section(title: string) {
  console.log(`\n=== ${title} ===`)
}

// ---------------------------------------------------------------------------
// 1. Black-point anchoring after shadows+40
// ---------------------------------------------------------------------------
section('1. Black anchoring (shadows+40)')

{
  const u = adjustmentsToUniforms({ ...neutralAdjustments(), shadows: 40 })
  assert(approx(u.uShadows, 0.4), `pipeline maps shadows+40 → ${u.uShadows}`)

  // Pure black must stay exactly 0 through the shadow curve alone.
  assert(
    approx(applyShadows(0, u.uShadows), 0),
    `applyShadows(0, ${u.uShadows}) == 0 (got ${applyShadows(0, u.uShadows)})`,
  )
  assert(
    approx(remapTonal(0, u.uShadows, 0, 0, 0), 0),
    `remapTonal black stays 0 (got ${remapTonal(0, u.uShadows, 0, 0, 0)})`,
  )

  // Near-black (≈1/255 encoded → linear) must stay near black — not lifted into grey.
  const nearBlackLin = 1 / 255 // upper bound; true sRGB 1/255 is even darker
  const afterNear = remapTonal(nearBlackLin, u.uShadows, 0, 0, 0)
  assert(
    afterNear < 0.02,
    `near-black ${nearBlackLin.toFixed(4)} after shadows+40 stays < 0.02 (got ${afterNear.toFixed(4)})`,
  )
  // Mid-shadow region DOES lift — otherwise the slider would be a no-op.
  const midShadow = remapTonal(0.12, u.uShadows, 0, 0, 0)
  assert(midShadow > 0.12, `shadows+40 lifts mid-shadow 0.12 → ${midShadow.toFixed(4)}`)

  // Full neutral-grade path on pure black stays at (or extremely near) display black.
  const gradedBlack = gradePixelLinear([0, 0, 0], {
    ...NEUTRAL_UNIFORMS,
    shadows: u.uShadows,
  })
  const blackOut = Math.max(gradedBlack[0], gradedBlack[1], gradedBlack[2])
  assert(
    blackOut < 1 / 255,
    `full path shadows+40: black out < 1/255 (got ${blackOut.toExponential(2)})`,
  )
}

// ---------------------------------------------------------------------------
// 2. Positive highlights → soft rolloff, not dead-white plateau
// ---------------------------------------------------------------------------
section('2. Soft highlight rolloff (highlights positive)')

{
  const hiAmount = adjustmentsToUniforms({
    ...neutralAdjustments(),
    highlights: 60,
  }).uHighlights

  // Build a dense upper ramp through: highlights → soft shoulder (shader end path).
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i <= 40; i++) {
    const x = 0.7 + (i / 40) * 0.6 // 0.7 .. 1.3 (allows overshoot past 1)
    const y = softShoulder(applyHighlights(x, hiAmount))
    xs.push(x)
    ys.push(y)
  }

  // No dead-white plateau: last several samples must not all sit at 1.0.
  const tail = ys.slice(-8)
  const allDeadWhite = tail.every((y) => y >= 1 - 1e-6)
  assert(!allDeadWhite, `positive highlights+softShoulder: no dead-white plateau at 1.0 (tail=${tail.map((y) => y.toFixed(3)).join(',')})`)

  // Soft transition = decreasing discrete slope in the shoulder region (x≥0.85).
  const slopes: number[] = []
  for (let i = 0; i < ys.length - 1; i++) {
    if (xs[i] < 0.85) continue
    slopes.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  }
  assert(slopes.length >= 4, `enough shoulder samples for slope check (${slopes.length})`)

  let decreasingPairs = 0
  for (let i = 0; i < slopes.length - 1; i++) {
    if (slopes[i + 1] <= slopes[i] + 1e-6) decreasingPairs++
  }
  const frac = decreasingPairs / (slopes.length - 1)
  assert(
    frac >= 0.7,
    `shoulder slopes mostly decreasing (${(frac * 100).toFixed(0)}% of pairs; slopes=${slopes.map((s) => s.toFixed(3)).join(',')})`,
  )

  // Final value approaches white asymptotically, stays strictly below 1 for finite input.
  const yAt1 = softShoulder(applyHighlights(1.0, hiAmount))
  assert(yAt1 < 1.0, `highlights+60 at x=1 soft-rolls to ${yAt1.toFixed(4)} < 1 (not hard clip)`)
  assert(yAt1 > 0.85, `still uses highlight headroom (${yAt1.toFixed(4)} > 0.85)`)
}

// ---------------------------------------------------------------------------
// 3. Shadow lift preserves hue / saturation (no desaturation / grey wash)
// ---------------------------------------------------------------------------
section('3. Hue/saturation preserved under shadow lift')

{
  // A warm shadow-colored linear pixel (not grey).
  const rgb: Rgb = [0.09, 0.045, 0.03]
  const shadows = adjustmentsToUniforms({
    ...neutralAdjustments(),
    shadows: 40,
  }).uShadows

  const oldLuma = lumaOf(rgb)
  const newLuma = remapTonal(oldLuma, shadows, 0, 0, 0)
  assert(newLuma > oldLuma, `shadow lift brightens luma ${oldLuma.toFixed(4)} → ${newLuma.toFixed(4)}`)

  const lifted = applyLumaRatio(rgb, newLuma)
  const before = rgbToHsv(rgb)
  const after = rgbToHsv(lifted)

  assert(
    hueDeltaDeg(before.h, after.h) < 0.5,
    `hue Δ < 0.5° (before ${before.h.toFixed(2)}, after ${after.h.toFixed(2)}, Δ=${hueDeltaDeg(before.h, after.h).toFixed(4)})`,
  )
  assert(
    approx(before.s, after.s, 1e-9),
    `HSV saturation unchanged under luma-ratio (${before.s.toFixed(6)} → ${after.s.toFixed(6)})`,
  )

  // Counter-example: old-style additive lift WOULD wash towards grey — prove the test has teeth.
  const additive: Rgb = [rgb[0] + 0.05, rgb[1] + 0.05, rgb[2] + 0.05]
  const additiveSat = rgbToHsv(additive).s
  assert(
    additiveSat < before.s - 0.05,
    `sanity: additive +0.05 DOES desaturate (${before.s.toFixed(3)} → ${additiveSat.toFixed(3)}), so sat check is meaningful`,
  )

  // Full-path check (profile + encode): hue should still be close after shadows+40.
  const graded0 = gradePixelLinear(rgb, NEUTRAL_UNIFORMS)
  const gradedS = gradePixelLinear(rgb, { ...NEUTRAL_UNIFORMS, shadows })
  const h0 = rgbToHsv(graded0)
  const hS = rgbToHsv(gradedS)
  assert(
    hueDeltaDeg(h0.h, hS.h) < 3,
    `full-path hue Δ after shadows+40 < 3° (got ${hueDeltaDeg(h0.h, hS.h).toFixed(2)}°)`,
  )
  assert(
    Math.abs(hS.s - h0.s) < 0.08,
    `full-path sat Δ after shadows+40 < 0.08 (got ${Math.abs(hS.s - h0.s).toFixed(4)})`,
  )
}

// ---------------------------------------------------------------------------
// 4. All-zero sliders ≠ identity; matches base S-curve profile
// ---------------------------------------------------------------------------
section('4. Neutral sliders apply base S-curve (not identity)')

{
  const u = adjustmentsToUniforms(neutralAdjustments())
  assert(u.uExposure === 0 && u.uContrast === 0, 'neutral uniforms: exposure/contrast 0')
  assert(u.uShadows === 0 && u.uHighlights === 0, 'neutral uniforms: tonal 0')
  assert(u.uSaturation === 1 && u.uVibrance === 0, 'neutral uniforms: sat=1 vib=0')

  const samples = [0.05, 0.12, 0.18, 0.35, 0.5, 0.75]
  let differed = 0

  for (const x of samples) {
    const grey: Rgb = [x, x, x]
    const out = gradePixelLinear(grey, NEUTRAL_UNIFORMS as GradeUniforms)

    // For neutral greys, linear path before encode ≈ softShoulder(baseSCurve(x));
    // baseSCurve already includes softShoulder, so below the knee out_linear ≈ baseSCurve(x).
    // We compare encoded output against encoding of baseSCurve(x).
    const expectedLin = softShoulder(baseSCurve(x))
    // gradePixelLinear encodes; compare via reverse isn't needed — compare channel equality
    // to grading a pure expected linear grey through encode-only... simpler: check R=G=B
    // and that luma tracks baseSCurve in linear domain by grading without encode divergence.

    // Reconstruct: for grey, gradePixelLinear does baseSCurve then softShoulder then encode.
    const expectedEnc = (() => {
      const y = softShoulder(baseSCurve(x))
      // linearToSrgb mirrored inline
      const enc =
        y <= 0.0031308 ? y * 12.92 : 1.055 * y ** (1 / 2.4) - 0.055
      return Math.min(Math.max(enc, 0), 1)
    })()

    assert(
      approx(out[0], expectedEnc, 2e-3) &&
        approx(out[1], expectedEnc, 2e-3) &&
        approx(out[2], expectedEnc, 2e-3),
      `neutral grey ${x}: out≈encode(softShoulder(baseSCurve)) (${out[0].toFixed(4)} vs ${expectedEnc.toFixed(4)})`,
    )

    if (Math.abs(out[0] - /* encode identity of x */ (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055)) > 0.004) {
      differed++
    }
  }

  assert(
    differed >= 3,
    `neutral ≠ identity on ≥3 greyscale samples (differed on ${differed}/${samples.length})`,
  )

  // Explicit mid-tone: base S raises 0.5 slightly; must not equal encoded identity.
  const midOut = gradePixelLinear([0.5, 0.5, 0.5], NEUTRAL_UNIFORMS)[0]
  const midId =
    0.5 <= 0.0031308 ? 0.5 * 12.92 : 1.055 * 0.5 ** (1 / 2.4) - 0.055
  assert(
    !approx(midOut, midId, 0.003),
    `neutral mid 0.5 differs from identity encode (${midOut.toFixed(4)} vs ${midId.toFixed(4)})`,
  )
  assert(
    approx(midOut, softShoulder(baseSCurve(0.5)) <= 0.0031308
      ? softShoulder(baseSCurve(0.5)) * 12.92
      : 1.055 * softShoulder(baseSCurve(0.5)) ** (1 / 2.4) - 0.055, 2e-3),
    'neutral mid matches base S-curve encode',
  )
}

// ---------------------------------------------------------------------------
// Supporting checks (pipeline / contrast smoke — not the four acceptance criteria)
// ---------------------------------------------------------------------------
section('Supporting: contrast + recipe smoke')

{
  assert(approx(applyShadows(0, 1), 0), 'applyShadows extreme still anchors black')
  const expanded = gradePixelLinear([0.4, 0.4, 0.4], {
    ...NEUTRAL_UNIFORMS,
    contrast: 0.7,
  })[0]
  const flat = gradePixelLinear([0.4, 0.4, 0.4], NEUTRAL_UNIFORMS)[0]
  assert(expanded > flat, `positive contrast expands mid (${flat.toFixed(4)} → ${expanded.toFixed(4)})`)

  const adj = {
    ...neutralAdjustments(),
    exposure: 100 * (0.5 / EXPOSURE_STOPS_AT_100),
    shadows: 40,
    contrast: 20,
  }
  const recipe = adjustmentsToUniforms(adj)
  assert(approx(recipe.uExposure, 0.5), `recipe exposure ${recipe.uExposure}`)
  assert(approx(recipe.uShadows, 0.4), `recipe shadows ${recipe.uShadows}`)

  const at50 = adjustmentsToUniforms({ ...neutralAdjustments(), exposure: 50 })
  assert(
    approx(at50.uExposure, EXPOSURE_STOPS_AT_100 * 0.5),
    `exposure ±50 → ±${EXPOSURE_STOPS_AT_100 * 0.5} stops (got ${at50.uExposure})`,
  )
}

if (failed > 0) {
  console.error(`\n${failed} failed, ${passed} passed`)
  process.exit(1)
}
console.log(`\nAll ${passed} checks passed.`)
