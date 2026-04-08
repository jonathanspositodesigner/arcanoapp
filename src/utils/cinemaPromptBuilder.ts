// Cinema Studio - Prompt Assembly Engine
// Translates cinematic control settings into structured AI prompts

export interface CameraMovementLayer {
  type: string;
  intensity: number; // 0-100
}

export interface CinemaSettings {
  // Scene
  sceneName: string;
  scenePrompt: string;
  subject: string;
  environment: string;
  timeOfDay: string;
  weather: string;

  // Camera Rig
  cameraBody: string;
  lensType: string;
  focalLength: number;
  aperture: string;
  cameraAngle: string;

  // Camera Movement
  movements: CameraMovementLayer[];

  // Genre & Mood
  genre: string;
  mood: string;
  colorGrade: string;

  // Video Settings
  speedRamp: string;
  duration: number;
  quality: string;
  aspectRatio: string;
  generateAudio: boolean;
  modelSpeed: 'standard' | 'fast';
}

// ━━━ Camera Body Prompts ━━━
const CAMERA_BODY_PROMPTS: Record<string, string> = {
  'ARRI Alexa 35': 'shot on ARRI Alexa 35, rich color science, cinematic',
  'RED V-RAPTOR': 'shot on RED V-RAPTOR, ultra-sharp, high resolution',
  'Sony Venice 2': 'shot on Sony Venice 2, full-frame, natural skin tones',
  'Blackmagic 6K': 'shot on Blackmagic 6K, RAW cinematic, indie aesthetic',
  '16mm Film': 'shot on 16mm film, grainy, vintage texture, organic',
  '8mm Film': 'shot on 8mm film, lo-fi, retro, nostalgic, heavy grain',
  'iPhone Cinematic': 'shot on iPhone cinematic mode, modern, clean, accessible',
};

// ━━━ Lens Type Prompts ━━━
const LENS_TYPE_PROMPTS: Record<string, string> = {
  'Anamorphic': 'anamorphic lens, oval bokeh, horizontal flares',
  'Spherical': 'spherical lens, natural perspective',
  'Prime': 'prime lens, sharp, fast aperture',
  'Zoom': 'zoom lens, versatile framing',
  'Macro': 'macro lens, extreme close-up detail',
  'Fish-eye': 'fisheye lens, ultra-wide distortion',
  'Tilt-shift': 'tilt-shift lens, selective focus plane, miniature effect',
};

// ━━━ Focal Length Descriptions ━━━
export const FOCAL_LENGTH_DESCRIPTIONS: Record<number, string> = {
  14: 'Ultra wide, dramatic distortion',
  24: 'Wide angle, environmental context',
  35: 'Natural, closest to human eye',
  50: 'Standard, balanced perspective',
  85: 'Portrait, subject compression',
  135: 'Telephoto, background compression',
};

// ━━━ Aperture Descriptions ━━━
export const APERTURE_DESCRIPTIONS: Record<string, string> = {
  'f/1.4': 'Max blur, cinematic bokeh',
  'f/2': 'Shallow depth, dreamy',
  'f/2.8': 'Balanced, versatile',
  'f/4': 'Moderate depth of field',
  'f/5.6': 'Sharper background',
  'f/8': 'Deep focus, detailed',
  'f/11': 'Everything sharp, landscape',
};

// ━━━ Camera Angle Prompts ━━━
const CAMERA_ANGLE_PROMPTS: Record<string, string> = {
  'Eye Level': '',
  'Low Angle': 'low angle shot, looking up at subject, empowering, dominant',
  'High Angle': 'high angle shot, looking down at subject, vulnerability, overview',
  'Dutch Angle': 'dutch angle, tilted frame, disorientation, tension, unease',
  'Bird\'s Eye': 'bird\'s eye view, directly overhead, top-down perspective, god\'s view',
  'Worm\'s Eye': 'worm\'s eye view, extreme low angle from ground level, towering perspective',
  'POV': 'POV shot, first-person perspective, through the eyes of the character',
  'Over the Shoulder': 'over the shoulder shot, OTS framing, depth, conversation perspective',
  'Hip Level': 'hip level shot, waist height camera, western style, cowboy framing',
  'Ground Level': 'ground level shot, camera at floor level, dramatic foreground, insects perspective',
};

// ━━━ Color Grade Prompts ━━━
const COLOR_GRADE_PROMPTS: Record<string, string> = {
  'Natural': '',
  'Warm Sunset': 'warm sunset color grade, golden tones, amber highlights',
  'Cold Blue': 'cold blue color grade, desaturated, steel blue tones',
  'Noir B&W': 'noir black and white, high contrast, dramatic shadows',
  'Teal & Orange': 'teal and orange color grade, complementary cinematic tones',
  'Vintage Film': 'vintage film color grade, faded colors, warm shadows, lifted blacks',
  'Neon Night': 'neon night color grade, vivid neon lights, deep shadows, cyberpunk',
  'Desaturated': 'desaturated muted color grade, low saturation, subtle tones',
  'High Contrast': 'high contrast grade, deep blacks, bright highlights, punchy',
};

// ━━━ Speed Ramp Prompts ━━━
const SPEED_RAMP_PROMPTS: Record<string, string> = {
  'Linear': '',
  'Auto': 'dynamic speed ramping',
  'Flash In': 'flash in speed ramp, fast start slowing down',
  'Flash Out': 'flash out speed ramp, slow start accelerating',
  'Slow-mo': 'slow motion, dramatic slow movement',
  'Bullet Time': 'bullet time effect, frozen moment, time nearly stopped',
  'Impact': 'impact speed ramp, fast to sudden stop on impact',
  'Ramp Up': 'speed ramp up, gradually accelerating movement',
};

// ━━━ Genre Prompts ━━━
const GENRE_PROMPTS: Record<string, string> = {
  'General': '',
  'Action': 'action genre, dynamic energy, fast-paced, intense',
  'Horror': 'horror genre, eerie, unsettling, dark atmosphere',
  'Comedy': 'comedy genre, bright, lighthearted, warm tones',
  'Noir': 'film noir, stark shadows, venetian blinds, mystery',
  'Drama': 'drama genre, emotional depth, nuanced lighting',
  'Epic': 'epic cinematic, grand scale, sweeping, majestic',
  'Thriller': 'thriller genre, suspenseful, tense atmosphere, edge-of-seat',
  'Romance': 'romance genre, soft warm light, intimate, dreamy',
  'Documentary': 'documentary style, natural, authentic, observational',
  'Sci-Fi': 'sci-fi genre, futuristic, technological, otherworldly',
  'Fantasy': 'fantasy genre, magical, ethereal, otherworldly elements',
};

// ━━━ Movement Intensity Labels ━━━
function getIntensityLabel(intensity: number): string {
  if (intensity <= 20) return 'very subtle';
  if (intensity <= 40) return 'subtle';
  if (intensity <= 60) return 'moderate';
  if (intensity <= 80) return 'strong';
  return 'dramatic';
}

// ━━━ Time of Day Prompts ━━━
const TIME_OF_DAY_PROMPTS: Record<string, string> = {
  'Dawn': 'at dawn, early morning light, soft pink and purple sky',
  'Morning': 'in the morning, bright natural light',
  'Midday': 'at midday, harsh overhead light, strong shadows',
  'Golden Hour': 'at golden hour, warm golden light, long shadows',
  'Dusk': 'at dusk, fading light, deep blue and orange sky',
  'Night': 'at night, dark, artificial or moonlight',
  'Unknown': '',
};

// ━━━ Weather Prompts ━━━
const WEATHER_PROMPTS: Record<string, string> = {
  'Clear': '',
  'Cloudy': 'overcast sky, diffused soft light',
  'Fog': 'foggy, misty atmosphere, low visibility, ethereal',
  'Rain': 'rainy, wet surfaces, water drops, reflections',
  'Storm': 'stormy, dramatic clouds, lightning, intense atmosphere',
  'Snow': 'snowy, white landscape, cold atmosphere, soft light',
  'Smoke': 'smoky atmosphere, haze, volumetric light through smoke',
};

// ━━━ MAIN BUILDER ━━━
export function buildCinemaPrompt(s: CinemaSettings): string {
  const parts: string[] = [];

  // Scene content
  if (s.subject) parts.push(s.subject);
  if (s.environment) parts.push(`in ${s.environment}`);

  const timePrompt = TIME_OF_DAY_PROMPTS[s.timeOfDay];
  if (timePrompt) parts.push(timePrompt);

  const weatherPrompt = WEATHER_PROMPTS[s.weather];
  if (weatherPrompt) parts.push(weatherPrompt);

  if (s.scenePrompt) parts.push(s.scenePrompt);

  // Camera rig
  const cameraPrompt = CAMERA_BODY_PROMPTS[s.cameraBody];
  if (cameraPrompt) parts.push(cameraPrompt);

  const lensPrompt = LENS_TYPE_PROMPTS[s.lensType];
  if (lensPrompt) parts.push(lensPrompt);

  parts.push(`${s.focalLength}mm`);
  parts.push(s.aperture);

  // Camera angle
  const anglePrompt = CAMERA_ANGLE_PROMPTS[s.cameraAngle];
  if (anglePrompt) parts.push(anglePrompt);

  // Camera movements (max 3)
  const movementParts = s.movements
    .filter(m => m.type !== 'None' && m.type !== '')
    .map(m => `${getIntensityLabel(m.intensity)} ${m.type.toLowerCase()}`)
    .join(' with ');
  if (movementParts) parts.push(movementParts);

  // Genre & mood
  const genrePrompt = GENRE_PROMPTS[s.genre];
  if (genrePrompt) parts.push(genrePrompt);

  if (s.mood) parts.push(`${s.mood.toLowerCase()} mood`);

  // Color grade
  const colorPrompt = COLOR_GRADE_PROMPTS[s.colorGrade];
  if (colorPrompt) parts.push(colorPrompt);

  // Speed ramp
  const speedPrompt = SPEED_RAMP_PROMPTS[s.speedRamp];
  if (speedPrompt) parts.push(speedPrompt);

  // Quality terms
  parts.push('cinematic, professional, sharp focus, detailed, atmospheric lighting');

  return parts.join(', ');
}

// ━━━ Default Settings ━━━
export function getDefaultSettings(): CinemaSettings {
  return {
    sceneName: '',
    scenePrompt: '',
    subject: '',
    environment: '',
    timeOfDay: 'Golden Hour',
    weather: 'Clear',
    cameraBody: 'ARRI Alexa 35',
    lensType: 'Anamorphic',
    focalLength: 35,
    aperture: 'f/2.8',
    movements: [{ type: 'None', intensity: 50 }],
    genre: 'General',
    mood: '',
    colorGrade: 'Natural',
    speedRamp: 'Linear',
    duration: 5,
    quality: '720p',
    aspectRatio: '16:9',
    generateAudio: true,
    modelSpeed: 'standard',
  };
}

// ━━━ Constants ━━━
export const CAMERA_BODIES = [
  { value: 'ARRI Alexa 35', desc: 'Cinema standard, rich color science' },
  { value: 'RED V-RAPTOR', desc: 'Ultra-high resolution, sharp' },
  { value: 'Sony Venice 2', desc: 'Full-frame, natural skin tones' },
  { value: 'Blackmagic 6K', desc: 'RAW cinematic, indie aesthetic' },
  { value: '16mm Film', desc: 'Grainy, vintage, raw texture' },
  { value: '8mm Film', desc: 'Lo-fi, retro, nostalgic' },
  { value: 'iPhone Cinematic', desc: 'Modern, accessible, clean' },
];

export const LENS_TYPES = ['Anamorphic', 'Spherical', 'Prime', 'Zoom', 'Macro', 'Fish-eye', 'Tilt-shift'];

export const FOCAL_PRESETS = [14, 24, 35, 50, 85, 135];

export const APERTURES = ['f/1.4', 'f/2', 'f/2.8', 'f/4', 'f/5.6', 'f/8', 'f/11'];

export const MOVEMENT_TYPES = [
  'None', 'Push In', 'Pull Out', 'Pan Left', 'Pan Right',
  'Tilt Up', 'Tilt Down', 'Dolly Left', 'Dolly Right',
  'Crane Up', 'Crane Down', 'Orbit Left', 'Orbit Right',
  'Handheld', 'Steadicam', 'Whip Pan', 'Zoom In', 'Zoom Out',
  'Drone Ascend', 'Drone Descend', 'Static',
];

export const GENRES = [
  'General', 'Action', 'Horror', 'Comedy', 'Noir', 'Drama',
  'Epic', 'Thriller', 'Romance', 'Documentary', 'Sci-Fi', 'Fantasy',
];

export const MOODS = [
  'Tense', 'Peaceful', 'Melancholic', 'Euphoric', 'Mysterious',
  'Intense', 'Playful', 'Dramatic', 'Romantic',
];

export const COLOR_GRADES = [
  'Natural', 'Warm Sunset', 'Cold Blue', 'Noir B&W',
  'Teal & Orange', 'Vintage Film', 'Neon Night', 'Desaturated', 'High Contrast',
];

export const SPEED_RAMPS = [
  'Linear', 'Auto', 'Flash In', 'Flash Out',
  'Slow-mo', 'Bullet Time', 'Impact', 'Ramp Up',
];

export const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '21:9'];
export const QUALITIES = ['480p', '720p'];
export const DURATIONS = [4, 5, 8, 10, 15];

export const TIMES_OF_DAY = ['Dawn', 'Morning', 'Midday', 'Golden Hour', 'Dusk', 'Night', 'Unknown'];
export const WEATHERS = ['Clear', 'Cloudy', 'Fog', 'Rain', 'Storm', 'Snow', 'Smoke'];

// Color grade swatches for UI
export const COLOR_GRADE_SWATCHES: Record<string, string> = {
  'Natural': '#8B9467',
  'Warm Sunset': '#E8943A',
  'Cold Blue': '#4A7FB5',
  'Noir B&W': '#3A3A3A',
  'Teal & Orange': '#2D8C8C',
  'Vintage Film': '#C4A265',
  'Neon Night': '#9B59B6',
  'Desaturated': '#9E9E9E',
  'High Contrast': '#1A1A1A',
};

// Genre icons for UI
export const GENRE_ICONS: Record<string, string> = {
  'General': '🎬',
  'Action': '💥',
  'Horror': '👻',
  'Comedy': '😄',
  'Noir': '🌑',
  'Drama': '🎭',
  'Epic': '⚔️',
  'Thriller': '😰',
  'Romance': '❤️',
  'Documentary': '📹',
  'Sci-Fi': '🚀',
  'Fantasy': '🧙',
};

// Time of day icons
export const TIME_ICONS: Record<string, string> = {
  'Dawn': '🌅',
  'Morning': '☀️',
  'Midday': '🌞',
  'Golden Hour': '🌇',
  'Dusk': '🌆',
  'Night': '🌙',
  'Unknown': '❓',
};

// Weather icons
export const WEATHER_ICONS: Record<string, string> = {
  'Clear': '☀️',
  'Cloudy': '☁️',
  'Fog': '🌫️',
  'Rain': '🌧️',
  'Storm': '⛈️',
  'Snow': '❄️',
  'Smoke': '💨',
};
