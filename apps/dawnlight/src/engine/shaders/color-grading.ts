import { Color } from 'three'

// Color Grading / Film Look Shader
export const ColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.1 },
    contrast: { value: 1.05 },
    brightness: { value: 0.0 },
    gamma: { value: 1.0 },
    // Color tint for shadows/midtones/highlights
    shadowTint: { value: new Color(0.95, 0.95, 1.0) },
    highlightTint: { value: new Color(1.0, 0.98, 0.95) },
    // Time of day factor (0 = night, 1 = day)
    timeOfDay: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform float brightness;
    uniform float gamma;
    uniform vec3 shadowTint;
    uniform vec3 highlightTint;
    uniform float timeOfDay;
    varying vec2 vUv;
    
    vec3 adjustSaturation(vec3 color, float sat) {
      float grey = dot(color, vec3(0.2126, 0.7152, 0.0722));
      return mix(vec3(grey), color, sat);
    }
    
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;
      
      // Apply brightness
      color += brightness;
      
      // Apply contrast
      color = (color - 0.5) * contrast + 0.5;
      
      // Apply saturation
      color = adjustSaturation(color, saturation);
      
      // Apply gamma correction
      color = pow(color, vec3(1.0 / gamma));
      
      // Color tinting based on luminance
      float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
      vec3 shadowColor = color * shadowTint;
      vec3 highlightColor = color * highlightTint;
      color = mix(shadowColor, highlightColor, smoothstep(0.0, 1.0, lum));
      
      // Subtle warm/cool shift based on time of day
      float warmth = mix(-0.02, 0.02, timeOfDay);
      color.r += warmth;
      color.b -= warmth;
      
      gl_FragColor = vec4(clamp(color, 0.0, 1.0), texel.a);
    }
  `,
}
