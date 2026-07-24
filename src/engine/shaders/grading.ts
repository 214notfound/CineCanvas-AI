// GLSL source for the grading filter.
//
// Design notes (see plan "调色引擎方案"):
// - Single fragment shader implements all 10 controls in a fixed, Lightroom-like
//   order: white balance -> exposure -> contrast -> highlights/shadows ->
//   whites/blacks -> vibrance -> saturation.
// - Everything runs in sRGB / perceptual space (no linear-light conversion).
//   White-balance gain is applied directly to sRGB values, consistent with the
//   exposure/contrast simplification we agreed on for the MVP.
// - Tonal controls (highlights/shadows/whites/blacks) use soft luminance masks;
//   vibrance is saturation-weighted so already-vivid colors and skin are spared.
// - Photos are opaque (alpha = 1), so Pixi's premultiplied alpha does not affect
//   the RGB math here.
//
// The vertex shader is the standard PixiJS v8 filter boilerplate; Pixi supplies
// uInputSize / uOutputFrame / uOutputTexture automatically.

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
uniform float uContrast;    // multiplier around mid-grey, e.g. 0.5 .. 1.5
uniform float uHighlights;  // -1 .. 1
uniform float uShadows;     // -1 .. 1
uniform float uWhites;      // -1 .. 1
uniform float uBlacks;      // -1 .. 1
uniform float uTemperature; // -1 (cool) .. 1 (warm)
uniform float uTint;        // -1 (green) .. 1 (magenta)
uniform float uVibrance;    // -1 .. 1
uniform float uSaturation;  // 0 .. 2 (1 = unchanged)

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

void main(void)
{
    vec4 src = texture2D(uTexture, vTextureCoord);
    vec3 c = src.rgb;

    // 1. White balance (direct sRGB gain)
    c.r += uTemperature * 0.10;
    c.b -= uTemperature * 0.10;
    c.g -= uTint * 0.10;
    c = clamp(c, 0.0, 1.0);

    // 2. Exposure
    c *= exp2(uExposure);

    // 3. Contrast around mid-grey
    c = (c - 0.5) * uContrast + 0.5;
    c = clamp(c, 0.0, 1.0);

    // Luminance used for tonal masks
    float luma = dot(c, LUMA);

    // 4. Highlights / Shadows (soft luma masks; positive = brighter)
    float hiMask = smoothstep(0.5, 1.0, luma);
    float shMask = 1.0 - smoothstep(0.0, 0.5, luma);
    c += uHighlights * hiMask * 0.5;
    c += uShadows * shMask * 0.5;

    // 5. Whites / Blacks (endpoints; positive = brighter)
    float wMask = smoothstep(0.7, 1.0, luma);
    float bMask = 1.0 - smoothstep(0.0, 0.3, luma);
    c += uWhites * wMask * 0.4;
    c += uBlacks * bMask * 0.4;
    c = clamp(c, 0.0, 1.0);

    // 6. Vibrance (saturation-weighted) then Saturation (uniform)
    float luma2 = dot(c, LUMA);
    float mx = max(c.r, max(c.g, c.b));
    float mn = min(c.r, min(c.g, c.b));
    float pxSat = mx - mn;                          // 0 grey .. 1 vivid
    float vibFactor = 1.0 + uVibrance * (1.0 - pxSat);
    c = mix(vec3(luma2), c, vibFactor);
    c = mix(vec3(luma2), c, uSaturation);
    c = clamp(c, 0.0, 1.0);

    gl_FragColor = vec4(c, src.a);
}
`
