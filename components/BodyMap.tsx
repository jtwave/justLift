import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Define the muscle groups and their SVG paths (simplified neutral body)
// You can expand this with more detail as needed
const MUSCLE_GROUPS = [
    'chest',
    'back',
    'biceps',
    'triceps',
    'shoulders',
    'abs',
    'quads',
    'hamstrings',
    'glutes',
    'calves',
    'forearms',
    'traps',
    'lats',
];

// Default colors for muscle groups
const DEFAULT_COLOR = 'white';

// SVG paths for each muscle group (simplified, stylized)
const musclePaths: Record<string, string> = {
    chest: 'M60,80 Q80,100 100,80 Q120,100 140,80 Q120,120 100,120 Q80,120 60,80 Z',
    back: 'M60,80 Q80,60 100,80 Q120,60 140,80 Q120,100 100,100 Q80,100 60,80 Z',
    biceps: 'M40,100 Q50,120 60,100 Q50,110 40,100 Z M160,100 Q150,120 140,100 Q150,110 160,100 Z',
    triceps: 'M35,120 Q45,140 60,120 Q50,130 35,120 Z M165,120 Q155,140 140,120 Q150,130 165,120 Z',
    shoulders: 'M55,70 Q70,60 85,70 Q70,80 55,70 Z M145,70 Q130,60 115,70 Q130,80 145,70 Z',
    abs: 'M85,120 Q100,140 115,120 Q100,130 85,120 Z',
    quads: 'M75,140 Q90,180 100,140 Q110,180 125,140 Q110,150 100,150 Q90,150 75,140 Z',
    hamstrings: 'M80,150 Q90,190 100,150 Q110,190 120,150 Q110,160 100,160 Q90,160 80,150 Z',
    glutes: 'M80,120 Q100,130 120,120 Q110,135 90,135 Q80,130 80,120 Z',
    calves: 'M90,180 Q95,210 100,180 Q105,210 110,180 Q105,190 100,190 Q95,190 90,180 Z',
    forearms: 'M30,140 Q40,170 60,140 Q50,155 30,140 Z M170,140 Q160,170 140,140 Q150,155 170,140 Z',
    traps: 'M80,60 Q100,40 120,60 Q110,55 90,55 Q80,60 80,60 Z',
    lats: 'M60,100 Q80,120 100,100 Q120,120 140,100 Q120,110 100,110 Q80,110 60,100 Z',
};

export default function BodyMap({ muscleColors = {} }: { muscleColors?: Record<string, string> }) {
    return (
        <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <Svg width={200} height={240} viewBox="0 0 200 240">
                {/* Body outline (neutral, white) */}
                <Path d="M100,40 Q60,60 60,80 Q60,120 75,140 Q90,180 95,210 Q100,220 105,210 Q110,180 125,140 Q140,120 140,80 Q140,60 100,40 Z" fill="white" stroke="#bbb" strokeWidth={2} />
                {/* Highlight muscle groups in blue scale */}
                {MUSCLE_GROUPS.map((group) => (
                    <Path
                        key={group}
                        d={musclePaths[group]}
                        fill={muscleColors[group] || 'rgba(0,120,255,0.15)'}
                        opacity={muscleColors[group] ? 0.85 : 0.15}
                        stroke="#1976d2"
                        strokeWidth={1}
                    />
                ))}
            </Svg>
        </View>
    );
} 