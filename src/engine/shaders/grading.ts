// GLSL source for the grading filter.
//
// Design notes (see plan "调色引擎对齐 LR 质感"):
// - Single fragment shader implements all 10 controls in a fixed order:
//   sRGB→linear → white balance → exposure → tonal remap (H/S/W/B) →
//   base filmic S-curve → contrast sigmoid → linear→sRGB →
//   vibrance → saturation.
// - Tone work happens in linear light; vibrance/saturation stay perceptual
//   (after encode), matching how those controls feel in Lightroom.
// - Highlights/Shadows use black/white-anchored curve remaps (not additive
//   offsets). Applied via luma-ratio scaling to avoid desaturation.
// - Soft shoulder replaces hard mid-pipeline clamps so highlights roll off.
// - Photos are opaque (alpha = 1); Pixi premultiplied alpha does not affect RGB.

export const gradingVertex = /* glsl */ `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`

export const gradingFragment = /* glsl */ `
in vec2 vTextureCoord;
uniform sampler2D uTexture;

uniform float uExposure;    // stops, e.g. -1.5 .. 1.5
uniform float uContrast;    // amount -1 .. 1 (0 = unchanged)
uniform float uHighlights;  // -1 .. 1
uniform float uShadows;     // -1 .. 1
uniform float uWhites;      // -1 .. 1
uniform float uBlacks;      // -1 .. 1
uniform float uTemperature; // -1 (cool) .. 1 (warm)
uniform float uTint;        // -1 (green) .. 1 (magenta)
uniform float uVibrance;    // -1 .. 1
uniform float uSaturation;  // 0 .. 2 (1 = unchanged)

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const float MID_GREY = 0.18;
const float EPS = 1e-6;

float srgbToLinear(float c)
{
    return (c <= 0.04045) ? (c / 12.92) : pow((c + 0.055) / 1.055, 2.4);
}

float linearToSrgb(float c)
{
    c = max(c, 0.0);
    return (c <= 0.0031308) ? (c * 12.92) : (1.055 * pow(c, 1.0 / 2.4) - 0.055);
}

vec3 srgbToLinear3(vec3 c)
{
    return vec3(srgbToLinear(c.r), srgbToLinear(c.g), srgbToLinear(c.b));
}

vec3 linearToSrgb3(vec3 c)
{
    return vec3(linearToSrgb(c.r), linearToSrgb(c.g), linearToSrgb(c.b));
}

// Soft shoulder: compress values approaching / exceeding 1 without hard clip.
float softShoulder(float x)
{
    float knee = 0.85;
    if (x <= knee) return x;
    float over = x - knee;
    float range = 1.0 - knee;
    // Allow ~0.6 stops of headroom before approaching white.
    float compressed = range * (1.0 - exp(-over / 0.55));
    return knee + compressed;
}

// Mild filmic S-curve — stands in for a default camera/profile look (Adobe Color-ish).
float baseSCurve(float x)
{
    // Soft toe + shoulder around mid-grey in linear.
    float t = max(x, 0.0);
    // Pivot contrast around MID_GREY without moving it much.
    float logX = log2(max(t, EPS));
    float logMid = log2(MID_GREY);
    float shaped = exp2((logX - logMid) * 1.12 + logMid);
    // Blend a little of the shaped curve in, then soft-shoulder.
    float mixed = mix(t, shaped, 0.35);
    return softShoulder(mixed);
}

// Shadows: lift/crush lower tones while keeping black (0) anchored.
float applyShadows(float x, float amount)
{
    // Weight peaks in deep–mid shadows, vanishes at 0 and above ~0.55.
    float w = x * pow(1.0 - smoothstep(0.0, 0.55, x), 1.5);
    return x + amount * w * 0.85;
}

// Highlights: recover/brighten upper tones while keeping white soft-anchored.
float applyHighlights(float x, float amount)
{
    // Weight peaks in upper midtones/highlights, vanishes at 0 and soft near 1.
    float w = pow(smoothstep(0.35, 1.0, x), 1.4) * (1.0 - x * 0.35);
    return x + amount * w * 0.75;
}

// Whites: move the white point (stronger near the top end).
float applyWhites(float x, float amount)
{
    float w = pow(smoothstep(0.55, 1.0, x), 1.6);
    return x + amount * w * 0.55;
}

// Blacks: move the black point (positive lifts blacks — intentional, LR-like).
float applyBlacks(float x, float amount)
{
    float w = pow(1.0 - smoothstep(0.0, 0.45, x), 1.6);
    return x + amount * w * 0.45;
}

float remapTonal(float luma, float shadows, float highlights, float whites, float blacks)
{
    float y = max(luma, 0.0);
    y = applyBlacks(y, blacks);
    y = applyShadows(y, shadows);
    y = applyHighlights(y, highlights);
    y = applyWhites(y, whites);
    return max(y, 0.0);
}

// GLSL ES 1.0 / WebGL1 has no built-in tanh (added in ES 3.00).
// Implement via exp; clamp the exponent to avoid overflow.
float tanhCompat(float x)
{
    float e = exp(clamp(2.0 * x, -20.0, 20.0));
    return (e - 1.0) / (e + 1.0);
}

// Sigmoid-style contrast pivoted on linear mid-grey.
// amount 0 → identity; >0 expands via S-curve; <0 compresses toward mid.
float applyContrast(float x, float amount)
{
    float pivot = MID_GREY;
    float a = clamp(amount, -1.0, 1.0);
    float d = x - pivot;

    if (a >= 0.0) {
        // Positive: tanh S-curve; k grows with amount. Near pivot ≈ linear * gain.
        float k = 2.4 + a * 3.2;
        float shaped = pivot + tanhCompat(d * k) / k * (1.0 + a * 1.8);
        return mix(x, max(shaped, 0.0), a);
    }

    // Negative: gently compress deviations from mid-grey (flatten contrast).
    float factor = 1.0 + a * 0.85; // a in [-1,0] → factor in [0.15, 1]
    return max(pivot + d * factor, 0.0);
}

void main(void)
{
    vec4 src = texture2D(uTexture, vTextureCoord);
    vec3 c = srgbToLinear3(src.rgb);

    // 1. White balance — multiplicative gains in linear, luma-normalized.
    float rGain = 1.0 + uTemperature * 0.28 + uTint * 0.08;
    float gGain = 1.0 - uTint * 0.20;
    float bGain = 1.0 - uTemperature * 0.28 + uTint * 0.08;
    vec3 wb = vec3(max(rGain, 0.05), max(gGain, 0.05), max(bGain, 0.05));
    float wbLuma = max(dot(wb, LUMA), EPS);
    c *= wb / wbLuma;

    // 2. Exposure (stops) in linear light.
    c *= exp2(uExposure);

    // 3. Tonal remap on luminance, applied via ratio (keeps chroma).
    float oldLuma = max(dot(c, LUMA), EPS);
    float newLuma = remapTonal(oldLuma, uShadows, uHighlights, uWhites, uBlacks);
    c *= newLuma / oldLuma;

    // 4. Base filmic S-curve (default profile) + soft shoulder per channel via luma.
    float luma2 = max(dot(c, LUMA), EPS);
    float profiled = baseSCurve(luma2);
    c *= profiled / luma2;

    // 5. Contrast sigmoid around mid-grey.
    float luma3 = max(dot(c, LUMA), EPS);
    float contrasted = applyContrast(luma3, uContrast);
    c *= contrasted / luma3;

    // Soft-shoulder each channel lightly so overshoots don't hard-clip.
    c = vec3(softShoulder(c.r), softShoulder(c.g), softShoulder(c.b));

    // 6. Encode to sRGB for perceptual saturation controls.
    c = linearToSrgb3(c);

    // 7. Vibrance (saturation-weighted) then Saturation (uniform).
    float lumaP = dot(clamp(c, 0.0, 1.0), LUMA);
    float mx = max(c.r, max(c.g, c.b));
    float mn = min(c.r, min(c.g, c.b));
    float pxSat = clamp(mx - mn, 0.0, 1.0);
    float vibFactor = 1.0 + uVibrance * (1.0 - pxSat);
    c = mix(vec3(lumaP), c, vibFactor);
    c = mix(vec3(lumaP), c, uSaturation);

    // Single final clamp.
    c = clamp(c, 0.0, 1.0);

    gl_FragColor = vec4(c, src.a);
}
`
