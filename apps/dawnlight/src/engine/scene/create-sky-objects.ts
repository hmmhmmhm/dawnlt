import { BackSide, BufferAttribute, BufferGeometry, type Camera, Color, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, Points, PointsMaterial, type Scene, ShaderMaterial, SphereGeometry } from 'three'
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js'
import { createLensflareTexture, createMoonTexture, createSunTexture } from '../../utils/textures'

export interface SkyObjectsSetup {
  sunSprite: Mesh
  moonSprite: Mesh
  lensflare: Lensflare
  stars: Points
  constellations: Points
  sky: Mesh
  skyMaterial: ShaderMaterial
}

const SUN_DISTANCE = 350 // Moved closer to prevent clipping with sky

export function createSkyObjects(scene: Scene): SkyObjectsSetup {
  // Sun Mesh (Box for voxel look)
  const sunTexture = createSunTexture()
  const sunMaterial = new MeshBasicMaterial({
    map: sunTexture,
    color: new Color(3, 3, 3), // HDR Intensity for stable Bloom
    depthWrite: false, // Prevent z-fighting
    depthTest: true,
    fog: false,
    side: DoubleSide,
  })
  const sunSprite = new Mesh(new PlaneGeometry(60, 60), sunMaterial)
  scene.add(sunSprite)

  // Moon Mesh
  const moonTexture = createMoonTexture()
  const moonMaterial = new MeshBasicMaterial({
    map: moonTexture,
    color: new Color(1.0, 1.0, 1.0),
    depthWrite: false,
    depthTest: true,
    fog: false,
    side: DoubleSide,
    transparent: true,
  })
  const moonSprite = new Mesh(new PlaneGeometry(50, 50), moonMaterial)
  scene.add(moonSprite)

  // Lensflare
  const textureFlare = createLensflareTexture()
  const lensflare = new Lensflare()
  lensflare.addElement(new LensflareElement(textureFlare, 500, 0, new Color(0xffffff)))
  sunSprite.add(lensflare)

  // Stars - Background (Faint)
  const stars = createStars(scene)

  // Stars - Constellations (Bright)
  const constellations = createConstellations(scene)

  // Sky
  const { sky, skyMaterial } = createSky(scene)

  return {
    sunSprite,
    moonSprite,
    lensflare,
    stars,
    constellations,
    sky,
    skyMaterial,
  }
}

function createStars(scene: Scene): Points {
  const starGeometry = new BufferGeometry()
  const starCount = 1500
  const starPositions = new Float32Array(starCount * 3)

  for (let i = 0; i < starCount; i++) {
    const r = 450
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    starPositions[i * 3 + 2] = r * Math.cos(phi)
  }

  starGeometry.setAttribute('position', new BufferAttribute(starPositions, 3))
  const starMaterial = new PointsMaterial({
    color: 0x8888aa, // Slightly bluish/dim
    size: 1.2,
    transparent: true,
    opacity: 0,
    fog: false,
    sizeAttenuation: true,
  })
  const stars = new Points(starGeometry, starMaterial)
  scene.add(stars)

  return stars
}

function createConstellations(scene: Scene): Points {
  const constellationGeometry = new BufferGeometry()
  const brightStarsPos: number[] = []

  const addStar = (ra: number, dec: number) => {
    const r = 449 // Slightly inside background stars
    const y = r * Math.sin(dec)
    const x = r * Math.cos(dec) * Math.cos(ra)
    const z = r * Math.cos(dec) * Math.sin(ra)
    brightStarsPos.push(x, y, z)
  }

  // Big Dipper (Ursa Major)
  addStar(3.4, 1.0) // Dubhe
  addStar(3.3, 0.95) // Merak
  addStar(3.5, 0.9) // Phecda
  addStar(3.6, 0.95) // Megrez
  addStar(3.8, 0.97) // Alioth
  addStar(3.9, 0.95) // Mizar
  addStar(4.1, 0.85) // Alkaid

  // Orion
  addStar(1.5, 0.1) // Betelgeuse
  addStar(1.3, -0.15) // Rigel
  addStar(1.35, 0.1) // Bellatrix
  addStar(1.48, -0.16) // Saiph
  // Belt
  addStar(1.4, -0.02)
  addStar(1.42, -0.03)
  addStar(1.44, -0.04)

  // Cassiopeia (W shape)
  addStar(0.1, 1.0)
  addStar(0.2, 0.95)
  addStar(0.3, 1.02)
  addStar(0.4, 0.95)
  addStar(0.5, 1.0)

  // Summer Triangle
  addStar(5.4, 0.8) // Vega
  addStar(5.2, 0.5) // Altair
  addStar(5.8, 0.7) // Deneb

  const constellationPositions = new Float32Array(brightStarsPos)
  constellationGeometry.setAttribute('position', new BufferAttribute(constellationPositions, 3))
  const constellationMaterial = new PointsMaterial({
    color: 0xffffff,
    size: 2.5, // Bigger
    transparent: true,
    opacity: 0,
    fog: false,
    sizeAttenuation: true,
  })
  const constellations = new Points(constellationGeometry, constellationMaterial)
  scene.add(constellations)

  return constellations
}

function createSky(scene: Scene): { sky: Mesh; skyMaterial: ShaderMaterial } {
  const skyGeometry = new SphereGeometry(500, 64, 64)
  const skyMaterial = new ShaderMaterial({
    uniforms: {
      topColor: { value: new Color(0x0077ff) },
      bottomColor: { value: new Color(0x87ceeb) },
      offset: { value: 20 },
      exponent: { value: 0.6 },
      time: { value: 0.0 },
      cloudCoverage: { value: 0.45 },
      cloudDensity: { value: 0.6 },
      sunIntensity: { value: 1.0 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec2 vUv;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      uniform float time;
      uniform float cloudCoverage;
      uniform float cloudDensity;
      uniform float sunIntensity;
      
      varying vec3 vWorldPosition;
      varying vec2 vUv;
      
      // Hash function for noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      
      // 2D Noise
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      
      // Fractional Brownian Motion for realistic cloud shapes
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        for (int i = 0; i < 6; i++) {
          value += amplitude * noise(p * frequency);
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        return value;
      }
      
      // Worley noise for cloud details
      float worley(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        
        float minDist = 1.0;
        for (int x = -1; x <= 1; x++) {
          for (int y = -1; y <= 1; y++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash(i + neighbor) * vec2(hash(i + neighbor + vec2(17.0, 31.0)), hash(i + neighbor + vec2(23.0, 47.0)));
            vec2 diff = neighbor + point - f;
            float dist = length(diff);
            minDist = min(minDist, dist);
          }
        }
        return minDist;
      }
      
      // Combined cloud noise
      float cloudNoise(vec2 uv, float t) {
        // Multiple layers of noise at different scales and speeds
        // Main wind direction (mostly X with slight Z drift)
        vec2 windDir = vec2(1.0, 0.15);
        vec2 movement = windDir * t * 0.08;
        
        // Different layers move at different speeds for parallax effect
        float n1 = fbm(uv * 2.0 + movement);
        float n2 = fbm(uv * 4.0 + movement * 1.3);
        float n3 = fbm(uv * 8.0 + movement * 0.6);
        
        // Combine noise layers
        float cloud = n1 * 0.6 + n2 * 0.3 + n3 * 0.1;
        
        // Add some worley-like detail
        float detail = 1.0 - worley(uv * 6.0 + movement * 0.7) * 0.3;
        cloud *= detail;
        
        return cloud;
      }
      
      // Aurora effect
      vec3 aurora(vec3 dir, float t, float daytime) {
        if (dir.y < 0.1) return vec3(0.0);
        
        // Aurora appears in upper sky
        float height = smoothstep(0.1, 0.6, dir.y);
        
        // Horizontal position for curtain effect
        float x = dir.x * 3.0;
        float z = dir.z * 2.0;
        
        // Multiple wave layers for aurora curtains
        float wave1 = sin(x * 2.0 + t * 0.3) * 0.5 + 0.5;
        float wave2 = sin(x * 3.5 - t * 0.2 + z) * 0.5 + 0.5;
        float wave3 = sin(x * 1.5 + t * 0.4 + z * 0.5) * 0.5 + 0.5;
        
        // Combine waves with noise for organic look
        float n = fbm(vec2(x + t * 0.1, z * 0.5 + t * 0.05) * 1.5);
        float curtain = wave1 * wave2 * 0.7 + wave3 * 0.3;
        curtain *= n;
        
        // Vertical streaks
        float streaks = fbm(vec2(x * 8.0 + t * 0.2, dir.y * 4.0)) * 0.5 + 0.5;
        curtain *= mix(0.7, 1.0, streaks);
        
        // Intensity based on height (stronger in middle, fade at top and bottom)
        float verticalFade = smoothstep(0.1, 0.3, dir.y) * smoothstep(0.9, 0.5, dir.y);
        curtain *= verticalFade;
        
        // Aurora colors - green/cyan/purple gradient
        vec3 color1 = vec3(0.1, 1.0, 0.4);  // Green
        vec3 color2 = vec3(0.1, 0.8, 1.0);  // Cyan
        vec3 color3 = vec3(0.6, 0.2, 0.9);  // Purple
        
        // Color variation based on position and time
        float colorMix = sin(x * 1.5 + t * 0.15) * 0.5 + 0.5;
        float colorMix2 = sin(z * 2.0 - t * 0.1) * 0.5 + 0.5;
        vec3 auroraColor = mix(color1, color2, colorMix);
        auroraColor = mix(auroraColor, color3, colorMix2 * 0.4);
        
        // Add shimmer
        float shimmer = sin(t * 2.0 + x * 10.0 + dir.y * 20.0) * 0.15 + 0.85;
        curtain *= shimmer;
        
        // Boost intensity during daytime to compensate for bright sky
        // Night (daytime ~0): base intensity, Day (daytime ~2): strongly boosted
        float dayBoost = 1.0 + daytime * 1.5;  // 1.0x at night, ~4.0x at peak day
        
        // Final intensity with day/night compensation
        float intensity = curtain * 0.5 * height * dayBoost;
        
        return auroraColor * intensity;
      }
      
      void main() {
        // Calculate sky gradient
        float h = normalize(vWorldPosition + offset).y;
        vec3 skyColor = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
        
        // Calculate cloud UV based on world position (projected onto a plane)
        vec3 dir = normalize(vWorldPosition);
        
        // Only render clouds above horizon
        if (dir.y > 0.0) {
          // Project direction onto cloud layer
          float cloudHeight = 0.3; // Normalized height where clouds appear
          vec2 cloudUV = dir.xz / (dir.y + 0.1) * 0.5;
          
          // Get cloud density at this point
          float cloudValue = cloudNoise(cloudUV, time);
          
          // Apply coverage threshold with smooth falloff
          float threshold = 1.0 - cloudCoverage;
          float clouds = smoothstep(threshold - 0.1, threshold + 0.2, cloudValue);
          
          // Add edge softness
          clouds *= smoothstep(0.0, 0.15, dir.y); // Fade near horizon
          
          // Cloud density variation
          clouds *= cloudDensity;
          
          // Cloud lighting based on sun intensity
          // Brighter during day, darker at night
          float dayBrightness = 0.3 + sunIntensity * 0.7;
          vec3 cloudColorBright = vec3(1.0, 1.0, 1.0) * dayBrightness;
          vec3 cloudColorDark = mix(vec3(0.3, 0.35, 0.4), vec3(0.7, 0.75, 0.8), sunIntensity);
          
          // Add depth to clouds with self-shadowing effect
          float shadowOffset = cloudNoise(cloudUV + vec2(0.03, 0.015), time);
          float selfShadow = smoothstep(threshold - 0.05, threshold + 0.3, shadowOffset);
          
          vec3 cloudColor = mix(cloudColorDark, cloudColorBright, selfShadow * 0.5 + 0.5);
          
          // Sunrise/sunset tinting (when sun is near horizon)
          if (sunIntensity > 0.1 && sunIntensity < 1.0) {
            float tintStrength = 1.0 - abs(sunIntensity - 0.5) * 2.0;
            vec3 sunsetTint = vec3(1.0, 0.7, 0.5);
            cloudColor = mix(cloudColor, cloudColor * sunsetTint, tintStrength * 0.4);
          }
          
          // Blend clouds with sky
          skyColor = mix(skyColor, cloudColor, clouds * 0.85);
        }
        
        // Add aurora effect (always visible, day and night)
        // Pass sunIntensity to boost aurora visibility during bright daytime
        vec3 auroraEffect = aurora(dir, time, sunIntensity);
        skyColor += auroraEffect;
        
        gl_FragColor = vec4(skyColor, 1.0);
      }
    `,
    side: BackSide,
    depthWrite: false, // Prevent sky from writing to depth buffer
  })
  const sky = new Mesh(skyGeometry, skyMaterial)
  sky.renderOrder = -1 // Render first
  scene.add(sky)

  return { sky, skyMaterial }
}

export function updateSunMoonPosition(sunSprite: Mesh, moonSprite: Mesh, camera: Camera, timeNorm: number): { sunX: number; sunY: number; sunZ: number } {
  const sunAngle = (timeNorm - 0.25) * Math.PI * 2

  const sunX = Math.cos(sunAngle) * SUN_DISTANCE
  const sunY = Math.sin(sunAngle) * SUN_DISTANCE
  const sunZ = Math.cos(sunAngle) * SUN_DISTANCE * 0.2 // Slight tilt

  sunSprite.position.set(sunX, sunY, sunZ).add(camera.position)
  sunSprite.lookAt(camera.position)

  moonSprite.position.set(-sunX, -sunY, -sunZ).add(camera.position)
  moonSprite.lookAt(camera.position)

  return { sunX, sunY, sunZ }
}
