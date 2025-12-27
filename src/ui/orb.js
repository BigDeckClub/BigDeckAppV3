/**
 * Orb visual configuration inspired by the five basic lands.
 * Provides mythic motifs and intensity tuning as choices progress.
 */

export const basicLandOrbs = [
    {
        land: "Plains",
        mythicForm: "Seraphic Griffin",
        aura: "stormlit dawn with crackling halos",
        sigil: "sunburst crest etched in stormglass",
        palette: {
            core: "#F7E7B2",
            glow: "#FFF4D6",
            shadow: "#C9B073"
        },
        ambient: "thunderhead radiance, gale-borne motes",
        environment: "tempest over sunlit plains, lightning veils in rolling gold"
    },
    {
        land: "Island",
        mythicForm: "Abyssal Leviathan",
        aura: "maelstrom tides with electric mist",
        sigil: "cyclone glyphs carved in silver",
        palette: {
            core: "#66B7E6",
            glow: "#B3E7FF",
            shadow: "#2C4E7A"
        },
        ambient: "whirlpool spray, rolling thunder",
        environment: "storm-wracked sea with towering waves and violet lightning"
    },
    {
        land: "Swamp",
        mythicForm: "Umbral Wraith Serpent",
        aura: "toxic squall with shadowflame arcs",
        sigil: "obsidian rune of the deep",
        palette: {
            core: "#5A3A8E",
            glow: "#A786FF",
            shadow: "#1D0F2E"
        },
        ambient: "acid rain hiss, spectral wind",
        environment: "grave-mire tempest with black lightning and sinking fog"
    },
    {
        land: "Mountain",
        mythicForm: "Volcanic Phoenix",
        aura: "eruption flare with ash storms",
        sigil: "riven magma seal",
        palette: {
            core: "#F26A3D",
            glow: "#FFC09A",
            shadow: "#5B1A0D"
        },
        ambient: "lava thunder, ember cyclones",
        environment: "storming caldera with ash squalls and firelight thunder"
    },
    {
        land: "Forest",
        mythicForm: "Ancient World-Tree Stag",
        aura: "emerald gale with living spores",
        sigil: "verdant knotwork sigil",
        palette: {
            core: "#5CC46B",
            glow: "#B8F2C1",
            shadow: "#204429"
        },
        ambient: "stormleaf rush, thundered canopy",
        environment: "ancient wildstorm with bending boughs and green lightning"
    }
];

export const orbIntensityLevels = [
    {
        stage: 0,
        label: "calm",
        glowStrength: 0.35,
        pulseSpeed: 0.9,
        particleDensity: 0.25,
        distortion: 0.08,
        transitionMs: 5200
    },
    {
        stage: 1,
        label: "awakening",
        glowStrength: 0.5,
        pulseSpeed: 1.1,
        particleDensity: 0.4,
        distortion: 0.12,
        transitionMs: 4400
    },
    {
        stage: 2,
        label: "mythic",
        glowStrength: 0.7,
        pulseSpeed: 1.35,
        particleDensity: 0.6,
        distortion: 0.18,
        transitionMs: 3600
    },
    {
        stage: 3,
        label: "ascendant",
        glowStrength: 0.9,
        pulseSpeed: 1.6,
        particleDensity: 0.85,
        distortion: 0.24,
        transitionMs: 3000
    },
    {
        stage: 4,
        label: "apex",
        glowStrength: 1.1,
        pulseSpeed: 1.9,
        particleDensity: 1,
        distortion: 0.3,
        transitionMs: 2400
    }
];

const clampChoiceCount = (choiceCount) =>
    Math.max(0, Math.min(choiceCount, orbIntensityLevels.length - 1));

/**
 * Returns the current orb state based on how many card options have been chosen.
 * @param {number} choiceCount
 * @param {number} cycleIndex
 * @returns {{land: object, nextLand: object, intensity: object, transition: object}}
 */
export const getOrbState = (choiceCount = 0, cycleIndex = 0) => {
    const intensityIndex = clampChoiceCount(choiceCount);
    const landIndex = ((cycleIndex % basicLandOrbs.length) + basicLandOrbs.length) %
        basicLandOrbs.length;
    const nextIndex = (landIndex + 1) % basicLandOrbs.length;

    const intensity = orbIntensityLevels[intensityIndex];
    const land = basicLandOrbs[landIndex];
    const nextLand = basicLandOrbs[nextIndex];

    return {
        land,
        nextLand,
        intensity,
        transition: {
            from: land.land,
            to: nextLand.land,
            style: "mythic-crossfade",
            durationMs: intensity.transitionMs,
            surge: intensity.glowStrength > 0.8 ? "radiant-bloom" : "soft-bloom"
        }
    };
};
