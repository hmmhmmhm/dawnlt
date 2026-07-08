# Farming And Gathering Loop

## Goal

The farming loop lets players gather wild crops for seeds and ingredients, craft a hoe and bucket, prepare and water farmland, plant crops, grow them over time, then turn wheat and rice into bread and rice-bowl ingredients.

## Player Loop

1. Find wild wheat and wild rice in forest or grassland areas.
2. Break wild crops to receive crop ingredients and seed drops.
3. Craft a wooden hoe from two planks, and craft an empty wooden bucket from planks and cobblestone.
4. Right-click grass or dirt with the hoe to create farmland. Farmland becomes wet near water or during rain.
5. Right-click a water block with an empty wooden bucket to get a water bucket, then use it on dry farmland to wet the soil.
6. Plant wheat seeds or rice seeds on farmland. Rice seeds can only be planted on wet farmland.
7. Crops grow through four stages: seedling, young crop, forming heads, and harvest-ready maturity. Wet farmland and rain increase growth odds.
8. Break mature crops to recover ingredients and more seeds.
9. Process wheat into flour and dough, or craft it directly into bread. Craft rice into a rice bowl.

## Blocks And Items

- `FARMLAND_DRY`, `FARMLAND_WET`: farmland blocks created with a hoe.
- `WILD_WHEAT`, `WILD_RICE`: naturally generated gatherable crops.
- `WHEAT_CROP_1..4`, `RICE_CROP_1..4`: the four growth states for planted crops.
- `WHEAT_SEEDS`, `RICE_SEEDS`: seed items that can be planted on farmland.
- `WHEAT`, `RICE`: food crafting ingredients.
- `WOODEN_HOE`: tool used to create farmland.
- `WOODEN_BUCKET`, `WATER_BUCKET`: tools used to collect water and wet dry farmland.
- `FLOUR`, `DOUGH`: intermediate materials that extend the wheat crafting loop.
- `BREAD`, `RICE_BOWL`: first-pass food outputs.

## Recipes

- Place two planks horizontally across the top row of the 2x2 crafting grid to craft `WOODEN_HOE`.
- Place one plank and one cobblestone diagonally to craft `WOODEN_BUCKET`.
- Place one wheat to craft `FLOUR`.
- Place two flour to craft `DOUGH`.
- Place three wheat in any three slots to craft `BREAD`.
- Place one rice to craft `RICE_BOWL`.

## Visual Direction

Only square blocks should use code-generated or texture-based rendering. `FARMLAND_DRY` and `FARMLAND_WET` stay as cube blocks with furrows and wetness color variation on the top face.

Non-square farming elements should prefer Meshy GLB models. Wild wheat and rice, crop growth stages, seeds, harvested ingredients, wooden hoes, buckets, flour, dough, bread, and rice bowls should appear in the world and as drops through `public/glb/meshy/*/*.glb` assets rather than code-generated cross meshes or cube items. Code should only handle placement, scale, rotation, subtle motion, and collection behavior.

## QA Support

Adding the `?agentQa=farming` URL parameter creates a farming demo field for browser-based visual checks. This hook is only for testing and visual QA; it is not exposed during normal play.
