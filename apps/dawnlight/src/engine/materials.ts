import { DoubleSide, FrontSide, type Mesh, MeshStandardMaterial } from 'three'
import { textureAtlas } from '../utils/textures'

// Shared uniforms for global time-based effects
const sharedUniforms = {
  uTime: { value: 0 },
}

export function updateGlobalShaderTime(deltaTime: number) {
  sharedUniforms.uTime.value += deltaTime
}

// Backwards compatibility / Alias
export const updateFoliageTime = updateGlobalShaderTime

type FoliageShaderUserData = {
  foliageShader?: {
    uniforms: Record<string, { value: unknown }>
  }
}

export function attachFoliageWindController(mesh: Mesh): void {
  mesh.userData.windEnabled ??= true
  mesh.onBeforeRender = (_renderer, _scene, _camera, _geometry, material) => {
    const shader = (material.userData as FoliageShaderUserData).foliageShader
    if (!shader) return
    const windUniform = shader.uniforms.uWindEnabled
    if (!windUniform) return
    windUniform.value = mesh.userData.windEnabled === false ? 0 : 1
  }
}

let foliageMaterial: MeshStandardMaterial | null = null
let fluidMaterial: MeshStandardMaterial | null = null
let solidMaterial: MeshStandardMaterial | null = null

export function getSolidMaterial(): MeshStandardMaterial {
  if (solidMaterial) return solidMaterial

  solidMaterial = new MeshStandardMaterial({
    vertexColors: true,
    map: textureAtlas,
    roughness: 0.8,
    metalness: 0.1,
    side: FrontSide,
  })

  return solidMaterial
}

export function getFoliageMaterial(): MeshStandardMaterial {
  if (foliageMaterial) return foliageMaterial

  foliageMaterial = new MeshStandardMaterial({
    vertexColors: true,
    map: textureAtlas,
    transparent: true,
    alphaTest: 0.5, // Higher alpha test for crisper leaves
    side: DoubleSide,
    roughness: 0.8,
    metalness: 0.1,
  })

  foliageMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedUniforms.uTime
    shader.uniforms.uWindEnabled = { value: 1 }
    ;(foliageMaterial?.userData as FoliageShaderUserData).foliageShader = shader

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform float uTime;
      uniform float uWindEnabled;
      attribute float windWeight;
      `,
    )

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      
      // Simple wind effect for leaves
      float windStrength = 0.15;
      float windSpeed = 2.0;
      float windScale = 0.5;
      
      // Calculate sway
      float swayX = sin(uTime * windSpeed + position.z * windScale) * windStrength;
      float swayZ = cos(uTime * windSpeed * 0.8 + position.x * windScale) * windStrength;
      float swayY = sin(uTime * windSpeed * 1.2 + position.x * windScale + position.z * windScale) * windStrength * 0.5;

      // Apply wind weight (0 for bottom of bush, 1 for top of bush/leaves)
      float finalWindWeight = windWeight * uWindEnabled;
      swayX *= finalWindWeight;
      swayZ *= finalWindWeight;
      swayY *= finalWindWeight;

      transformed.x += swayX;
      transformed.z += swayZ;
      transformed.y += swayY;
      `,
    )
  }

  foliageMaterial.customProgramCacheKey = () => {
    return 'foliage-wind'
  }

  return foliageMaterial
}

export function getFluidMaterial(): MeshStandardMaterial {
  if (fluidMaterial) return fluidMaterial

  fluidMaterial = new MeshStandardMaterial({
    vertexColors: true,
    map: textureAtlas,
    transparent: true,
    opacity: 0.85,
    alphaTest: 0.1,
    side: DoubleSide,
    depthWrite: false, // Water usually shouldn't write depth to allow transparency sorting/seeing through
    roughness: 0.05, // More reflective water
    metalness: 0.15,
  })

  fluidMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedUniforms.uTime

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform float uTime;
      varying float vWaveHeight;
      varying vec3 vWorldPos;
      `,
    )

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      
      // === ENHANCED OCEAN WAVE SYSTEM ===
      float time = uTime;
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      
      // === DIRECTIONAL OCEAN WAVES (traveling toward shore) ===
      // Main wave direction (diagonal, simulating wind-driven waves)
      vec2 waveDir1 = normalize(vec2(0.7, 0.7));
      vec2 waveDir2 = normalize(vec2(-0.3, 0.9));
      vec2 waveDir3 = normalize(vec2(0.9, -0.2));
      
      // Position along wave directions
      float pos1 = dot(position.xz, waveDir1);
      float pos2 = dot(position.xz, waveDir2);
      float pos3 = dot(position.xz, waveDir3);
      
      // === PRIMARY OCEAN SWELLS (large, slow, rolling waves) ===
      float swellSpeed = 0.8;
      float swellWavelength = 0.04; // Larger waves
      float swell1 = sin(time * swellSpeed - pos1 * swellWavelength) * 1.0;
      float swell2 = sin(time * swellSpeed * 0.7 - pos2 * swellWavelength * 1.3) * 0.7;
      
      // Add Gerstner-like wave shape (steeper crests, flatter troughs)
      float gerstnerPhase1 = time * swellSpeed - pos1 * swellWavelength;
      float gerstnerPhase2 = time * swellSpeed * 0.7 - pos2 * swellWavelength * 1.3;
      float gerstner1 = pow(sin(gerstnerPhase1) * 0.5 + 0.5, 1.5) * 2.0 - 1.0;
      float gerstner2 = pow(sin(gerstnerPhase2) * 0.5 + 0.5, 1.5) * 2.0 - 1.0;
      float totalSwell = gerstner1 * 0.85 + gerstner2 * 0.6;
      
      // === MEDIUM WAVES (wind-driven chop) ===
      float waveSpeed = 1.5;
      float waveWavelength = 0.1;
      float wave1 = sin(time * waveSpeed - pos1 * waveWavelength * 1.5) * 0.6;
      float wave2 = sin(time * waveSpeed * 1.2 - pos3 * waveWavelength * 1.2) * 0.45;
      float wave3 = cos(time * waveSpeed * 0.9 + pos2 * waveWavelength * 0.8) * 0.35;
      
      // === SURFACE RIPPLES (fine detail, high frequency) ===
      float rippleSpeed = 3.0;
      float rippleScale = 0.4;
      float ripple1 = sin(time * rippleSpeed + position.x * rippleScale + position.z * rippleScale * 0.9) * 0.2;
      float ripple2 = cos(time * rippleSpeed * 1.3 + position.x * rippleScale * 0.8 - position.z * rippleScale * 1.1) * 0.15;
      float ripple3 = sin(time * rippleSpeed * 0.7 - position.x * rippleScale * 1.2 + position.z * rippleScale) * 0.1;
      
      // === BREAKING WAVE EFFECT (periodic big waves) ===
      // Slow modulation creates occasional big waves
      float breakingMod = sin(time * 0.12 + pos1 * 0.015) * 0.5 + 0.5;
      float breakingMod2 = sin(time * 0.09 - pos2 * 0.02) * 0.5 + 0.5;
      float breakingIntensity = pow(breakingMod * breakingMod2, 2.0); // Sharp peaks
      
      // Breaking wave with steeper front
      float breakPhase = time * 0.6 - pos1 * 0.05;
      float breakWave = pow(max(0.0, sin(breakPhase)), 2.0) * breakingIntensity * 2.0;
      
      // Extra dramatic crest
      float crestPhase = time * 0.4 - pos1 * 0.03 + pos2 * 0.02;
      float crest = pow(max(0.0, sin(crestPhase) - 0.5), 2.0) * breakingIntensity * 2.5;
      
      // === SURGE EFFECT (very slow, adds variety) ===
      float surgeCycle = sin(time * 0.08) * 0.5 + 0.5;
      float surge = surgeCycle * sin(time * 0.3 - pos1 * 0.06) * 0.7;
      
      // === COMBINE ALL WAVE LAYERS ===
      float totalWave = totalSwell + wave1 + wave2 + wave3 + ripple1 + ripple2 + ripple3 + breakWave + crest + surge;
      
      // Asymmetric wave shape: waves rise more than they fall
      totalWave = totalWave * 0.7 + max(totalWave, 0.0) * 0.3;
      
      // Clamp minimum to prevent extreme dips
      totalWave = max(totalWave, -0.4);
      
      // === SURFACE-ONLY WAVE EFFECT ===
      // Only apply waves to top surface vertices, not bottom
      // This prevents the "carpet effect" where bottom moves with top
      
      // Determine wave influence based on face normal and vertex position
      float waveInfluence = 1.0;
      
      if (normal.y > 0.5) {
        // Top face - full wave effect
        waveInfluence = 1.0;
      } else if (normal.y < -0.5) {
        // Bottom face - no wave effect at all
        waveInfluence = 0.0;
      } else {
        // Side faces - only top edge vertices should move
        // Use fract to get position within the block (0-1 range)
        float blockLocalY = fract(position.y + 0.001);
        // Top edge of side face (localY close to 1 or 0 depending on block alignment)
        // Smoothly transition: bottom of side = no wave, top of side = full wave
        waveInfluence = smoothstep(0.4, 0.9, blockLocalY);
      }
      
      // Store wave height for fragment shader (foam effect)
      vWaveHeight = totalWave * waveInfluence;
      
      // Apply wave with influence factor
      transformed.y += totalWave * waveInfluence;
      
      // === HORIZONTAL MOVEMENT (water flow/current) ===
      // Orbital motion like real ocean waves - also only on surface
      float flowSpeed = 0.8;
      float flowStrength = 0.35;
      float orbitalPhase = time * flowSpeed - pos1 * 0.08;
      transformed.x += sin(orbitalPhase) * flowStrength * (0.5 + breakingIntensity * 0.5) * waveInfluence;
      transformed.z += cos(orbitalPhase * 0.8 + 0.5) * flowStrength * 0.7 * waveInfluence;
      
      // Surge movement (waves rushing in) - also only on surface
      float surgeFlow = sin(time * 0.5 - pos1 * 0.04) * 0.25 * surgeCycle;
      transformed.x += waveDir1.x * surgeFlow * waveInfluence;
      transformed.z += waveDir1.y * surgeFlow * waveInfluence;
      `,
    )

    // Fragment shader for foam effect on wave crests
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
      #include <common>
      varying float vWaveHeight;
      varying vec3 vWorldPos;
      uniform float uTime;
      `,
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      
      // === FOAM/WHITECAP EFFECT ON WAVE CRESTS ===
      float foamThreshold = 0.6; // Wave height where foam starts
      float foamIntensity = smoothstep(foamThreshold, foamThreshold + 0.8, vWaveHeight);
      
      // Add noise to foam for natural look
      float foamNoise1 = sin(vWorldPos.x * 2.0 + uTime * 3.0) * 0.5 + 0.5;
      float foamNoise2 = cos(vWorldPos.z * 2.5 - uTime * 2.5) * 0.5 + 0.5;
      float foamNoise = foamNoise1 * foamNoise2;
      
      // Sparkle effect on foam
      float sparkle = pow(foamNoise, 3.0) * foamIntensity * 0.5;
      
      // === DYNAMIC FOAM COLOR (based on water/sky color) ===
      // 'diffuse' is the water color set by material.color (which reflects sky)
      vec3 baseWaterColor = diffuse;
      
      // Create foam color: more visible while staying harmonious
      vec3 foamColor = mix(baseWaterColor, vec3(1.0), 0.28); // 28% toward white
      foamColor = foamColor * 1.12; // Brighter
      foamColor = min(foamColor, vec3(1.0)); // Clamp
      
      float finalFoam = foamIntensity * (0.3 + foamNoise * 0.45);
      diffuseColor.rgb = mix(diffuseColor.rgb, foamColor, finalFoam * 0.45); // Stronger blend
      diffuseColor.rgb += sparkle * foamColor * 0.4; // More sparkle
      
      // Slight color variation based on depth (wave troughs are darker)
      float depthDarken = smoothstep(-0.2, 0.3, vWaveHeight);
      diffuseColor.rgb *= 0.85 + depthDarken * 0.15;
      `,
    )
  }

  fluidMaterial.customProgramCacheKey = () => {
    return 'fluid-wave-v2'
  }

  return fluidMaterial
}
