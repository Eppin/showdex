// import { getFinalSpeed, getModifiedStat } from '@smogon/calc/dist/mechanics/util';
import { PokemonInitialStats, PokemonSpeedReductionItems, PokemonStatNames } from '@showdex/consts';
import { formatId as id } from '@showdex/utils/app';
// import { detectSpeciesForme } from '@showdex/utils/battle';
import { env } from '@showdex/utils/core';
import { logger } from '@showdex/utils/debug';
import type { Generation, GenerationNum } from '@pkmn/data';
import type { CalcdexBattleField, CalcdexPlayerKey, CalcdexPokemon } from '@showdex/redux/store';
import { calcPokemonHp } from './calcPokemonHp';
// import { createSmogonField } from './createSmogonField';
// import { createSmogonPokemon } from './createSmogonPokemon';

const l = logger('@showdex/utils/calc/calcPokemonFinalStats');

/**
 * Reimplementation of `calculateModifiedStats()` in the Showdown client's `BattleTooltip`.
 *
 * * Makes use of our custom `CalcdexPokemon` and `CalcdexBattleField` properties wherever possible
 *   to better integrate with the Calcdex's state (which many properties are user-mutable).
 * * Though the aforementioned function exists in the client, it reads directly from the battle state,
 *   preventing us from non-destructively incorporating the Calcdex's state.
 *   - In other words, would be a pain in the ass to incorporate the user's inputs into the function,
 *     which requires writing directly into the battle state, hoping that we didn't fuck something up.
 *   - Let's not forget that we gotta get our `CalcdexBattleField` in there too!
 * * Hence why I chose death.
 *
 * @see https://github.com/smogon/pokemon-showdown-client/blob/master/src/battle-tooltips.ts#L959-L1213
 * @since 0.1.3
 */
export const calcPokemonFinalStats = (
  dex: Generation,
  pokemon: DeepPartial<CalcdexPokemon>,
  opponentPokemon: DeepPartial<CalcdexPokemon>,
  field: CalcdexBattleField,
  playerKey: CalcdexPlayerKey,
): Showdown.StatsTable => {
  if (typeof dex?.stats?.calc !== 'function' || typeof dex?.species?.get !== 'function') {
    if (__DEV__) {
      l.warn(
        'Cannot calculate stats since dex.stats.calc() and/or dex.species.get() are not available.',
        '\n', 'dex', dex,
        '\n', 'pokemon', pokemon,
        '\n', 'field', field,
        '\n', 'playerKey', playerKey,
        '\n', '(You will only see this warning on development.)',
      );
    }

    return { ...PokemonInitialStats };
  }

  const gen = dex.num || <GenerationNum> env.int('calcdex-default-gen');

  // const speciesForme = detectSpeciesForme(pokemon);

  // if (!speciesForme) {
  //   l.warn(
  //     'cannot calculate stats since the Pokemon\'s detected speciesForme is falsy',
  //     // '\n', 'pokemon.ident', pokemon?.ident,
  //     '\n', 'speciesForme', speciesForme,
  //     '\n', 'pokemon', pokemon,
  //   );
  //
  //   return initialStats;
  // }

  // const species = dex.species.get(speciesForme);

  const hpPercentage = calcPokemonHp(pokemon);

  const ability = id(pokemon.dirtyAbility || pokemon.ability);
  const opponentAbility = id(opponentPokemon.dirtyAbility || opponentPokemon.ability);

  // const nature = pokemon?.nature && typeof dex.natures?.get === 'function' ?
  //   dex.natures.get(pokemon.nature) :
  //   undefined;

  // these are used for determining stat increases/decreases due to status conditions
  // const gen = dex.num;
  // const hasGuts = pokemon?.ability?.toLowerCase?.() === 'guts';
  // const hasQuickFeet = pokemon?.ability?.toLowerCase?.() === 'quick feet';
  // const hasDefeatist = pokemon?.ability?.toLowerCase() === 'defeatist';

  // const smogonPokemon = createSmogonPokemon(dex, pokemon);
  // const smogonField = createSmogonField(field);

  // rebuild the Pokemon's base stats to make sure all values are available
  // const baseStats: CalcdexPokemon['baseStats'] = {
  //   hp: pokemon?.baseStats?.hp ?? 0,
  //   atk: pokemon?.baseStats?.atk ?? 0,
  //   def: pokemon?.baseStats?.def ?? 0,
  //   spa: pokemon?.baseStats?.spa ?? 0,
  //   spd: pokemon?.baseStats?.spd ?? 0,
  //   spe: pokemon?.baseStats?.spe ?? 0,
  // };

  // const baseStats: CalcdexPokemon['baseStats'] = {
  //   hp: species?.baseStats?.hp ?? 0,
  //   atk: species?.baseStats?.atk ?? 0,
  //   def: species?.baseStats?.def ?? 0,
  //   spa: species?.baseStats?.spa ?? 0,
  //   spd: species?.baseStats?.spd ?? 0,
  //   spe: species?.baseStats?.spe ?? 0,
  // };

  // do the same thing for the Pokemon's IVs and EVs
  // const ivs: Showdown.StatsTable = {
  //   hp: pokemon?.ivs?.hp ?? 31,
  //   atk: pokemon?.ivs?.atk ?? 31,
  //   def: pokemon?.ivs?.def ?? 31,
  //   spa: pokemon?.ivs?.spa ?? 31,
  //   spd: pokemon?.ivs?.spd ?? 31,
  //   spe: pokemon?.ivs?.spe ?? 31,
  // };

  // const evs: Showdown.StatsTable = {
  //   hp: pokemon?.evs?.hp ?? 0,
  //   atk: pokemon?.evs?.atk ?? 0,
  //   def: pokemon?.evs?.def ?? 0,
  //   spa: pokemon?.evs?.spa ?? 0,
  //   spd: pokemon?.evs?.spd ?? 0,
  //   spe: pokemon?.evs?.spe ?? 0,
  // };

  const boostTable = gen > 2
    ? [1, 1.5, 2, 2.5, 3, 3.5, 4]
    : [1, 100 / 66, 2, 2.5, 100 / 33, 100 / 28, 4];

  const boosts: Showdown.StatsTable = {
    atk: (pokemon?.dirtyBoosts?.atk ?? pokemon?.boosts?.atk) || 0,
    def: (pokemon?.dirtyBoosts?.def ?? pokemon?.boosts?.def) || 0,
    spa: (pokemon?.dirtyBoosts?.spa ?? pokemon?.boosts?.spa) || 0,
    spd: (pokemon?.dirtyBoosts?.spd ?? pokemon?.boosts?.spd) || 0,
    spe: (pokemon?.dirtyBoosts?.spe ?? pokemon?.boosts?.spe) || 0,
  };

  // const calculatedStats: CalcdexPokemon['calculatedStats'] = PokemonStatNames.reduce((prev, stat) => {
  //   if (stat === 'spe') {
  //     const fieldSide = side === 'attacker' ? smogonField.attackerSide : smogonField.defenderSide;
  //
  //     prev.spe = getFinalSpeed(
  //       dex,
  //       smogonPokemon,
  //       smogonField,
  //       fieldSide,
  //     );
  //   } else {
  //     prev[stat] = getModifiedStat(
  //       smogonPokemon.rawStats[stat],
  //       smogonPokemon.boosts[stat],
  //       dex,
  //     );
  //   }
  //
  //   return prev;
  // }, { ...initialStats });

  // const calculatedStats: CalcdexPokemon['calculatedStats'] = PokemonStatNames.reduce((prev, stat) => {
  //   prev[stat] = dex.stats.calc(
  //     stat,
  //     baseStats[stat],
  //     ivs[stat],
  //     evs[stat],
  //     pokemon?.level || 100,
  //     nature,
  //   );
  //
  //   // if the Pokemon is Zygarde-Complete, double its HP
  //   if (speciesForme === 'Zygarde-Complete' && stat === 'hp') {
  //     prev[stat] *= 2;
  //   }
  //
  //   // re-calculate any boosted stat (except for HP, obviously)
  //   if (stat !== 'hp' && stat in boosts) {
  //     const stage = boosts[stat];
  //
  //     if (stage) {
  //       const clampedStage = Math.min(Math.max(stage, -6), 6); // -6 <= stage <= 6
  //       const multiplier = ((Math.abs(clampedStage) + 2) / 2) ** (clampedStage < 0 ? -1 : 1);
  //
  //       prev[stat] *= multiplier;
  //     }
  //
  //     // handle reductions due to abilities
  //     if ('slowstart' in (pokemon?.volatiles || {}) && pokemon?.abilityToggled) {
  //       // 50% ATK/SPE reduction due to "Slow Start"
  //       if (['atk', 'spe'].includes(stat)) {
  //         prev[stat] *= 0.5;
  //       }
  //     }
  //
  //     // handle boosts/reductions by the Pokemon's current HP
  //     const hp = calcPokemonHp(pokemon);
  //
  //     if (hasDefeatist && hp <= 0.5) {
  //       if (['atk', 'spa'].includes(stat)) {
  //         prev[stat] *= 0.5;
  //       }
  //     }
  //
  //     // handle boosts/reductions by the Pokemon's current status condition, if any
  //     if (pokemon?.status) {
  //       if (hasGuts) {
  //         // 50% ATK boost w/ non-volatile status condition due to "Guts"
  //         if (stat === 'atk') {
  //           prev[stat] *= 1.5;
  //         }
  //       } else if (hasQuickFeet) {
  //         // 50% SPE boost w/ non-volatile status condition due to "Quick Feet"
  //         if (stat === 'spe') {
  //           prev[stat] *= 1.5;
  //         }
  //       } else { // Pokemon does not have either "Guts" or "Quick Feet"
  //         switch (pokemon.status) {
  //           case 'brn': {
  //             // 50% ATK reduction (all gens... probably)
  //             if (stat === 'atk') {
  //               prev[stat] *= 0.5;
  //             }
  //
  //             break;
  //           }
  //
  //           case 'par': {
  //             // 25% SPE reduction if gen < 7 (i.e., gens 1 to 6), otherwise 50% SPE reduction
  //             if (stat === 'spe') {
  //               prev[stat] *= 1 - (gen < 7 ? 0.25 : 0.5);
  //             }
  //
  //             break;
  //           }
  //
  //           default: {
  //             break;
  //           }
  //         }
  //       }
  //     }
  //   }
  //
  //   return prev;
  // }, { ...initialStats });

  // l.debug(
  //   'calcPokemonStats() -> return calculatedStats',
  //   '\n', 'stats calculated for Pokemon', pokemon.ident || pokemon.speciesForme,
  //   '\n', 'calculatedStats', calculatedStats,
  //   '\n', 'pokemon', pokemon,
  //   '\n', 'speciesForme', speciesForme,
  // );

  const currentStats: Showdown.StatsTable = {
    ...PokemonInitialStats,
    ...pokemon.baseStats,
    ...pokemon.spreadStats,
    ...pokemon.serverStats,
  };

  const hasTransform = 'transform' in pokemon.volatiles;
  const hasFormeChange = 'formechange' in pokemon.volatiles;

  const speciesForme = hasTransform && hasFormeChange
    ? pokemon.volatiles.formechange[1]
    : pokemon.speciesForme;

  const species = dex.species.get(speciesForme);
  const baseForme = id(species?.baseSpecies);

  const hasPowerTrick = 'powertrick' in pokemon.volatiles; // this is a move btw, not an ability!
  const hasEmbargo = 'embargo' in pokemon.volatiles; // this is also a move
  const hasGuts = ability === 'guts';
  const hasQuickFeet = ability === 'quickfeet';

  const item = id(pokemon.dirtyItem ?? pokemon.item);

  const ignoreItem = hasEmbargo
    || field.isMagicRoom
    || (ability === 'klutz' && !PokemonSpeedReductionItems.map((i) => id(i)).includes(item));

  const finalStats: Showdown.StatsTable = PokemonStatNames.reduce((stats, stat) => {
    // apply effects to non-HP stats
    if (stat !== 'hp') {
      // swap ATK and DEF if "Power Trick" was used
      if (hasPowerTrick) {
        stats[stat] = currentStats[stat === 'atk' ? 'def' : 'atk'] || 0;
      }

      // apply stat boosts if not 0 (cause it'd do nothing)
      const stage = boosts[stat];

      if (stage) {
        const boostValue = boostTable[Math.abs(stage)];
        const boostMultiplier = stage > 0 ? boostValue : 1 / boostValue;

        stats[stat] = Math.floor(stats[stat] * boostMultiplier);
      }

      // apply status condition effects
      if (pokemon.status) {
        if (gen > 2 && ((stat === 'atk' && hasGuts) || (stat === 'spe' && hasQuickFeet))) {
          // 50% ATK boost w/ non-volatile status condition due to "Guts" (gen 3+)
          // 50% SPE boost w/ non-volatile status condition due to "Quick Feet" (gen 4+)
          stats[stat] = Math.floor(stats[stat] * 1.5);
        }

        switch (pokemon.status) {
          case 'brn': {
            if (stat === 'atk') {
              // 50% ATK reduction (all gens... probably)
              stats[stat] = Math.floor(stats[stat] * 0.5);
            }

            break;
          }

          case 'par': {
            if (stat === 'spe' && (gen < 4 || !hasQuickFeet)) {
              // 75% SPE reduction if gen < 7 (i.e., gens 1-6), otherwise 50% SPE reduction
              // (reduction is negated if ability is "Quick Feet", which is only available gen 4+)
              stats[stat] = Math.floor(stats[stat] * (gen < 7 ? 0.25 : 0.5));
            }

            break;
          }

          default: {
            break;
          }
        }
      }
    }

    if (gen <= 1) {
      stats[stat] = Math.min(stats[stat], 999);
    }

    return stats;
  }, { ...currentStats });

  // gen 1 doesn't support items
  if (gen <= 1) {
    return finalStats;
  }

  // apply gen 2-compatible item effects
  // (at this point, we should at least be gen 2)
  const speedMods: number[] = [];

  if (baseForme === 'pikachu' && !ignoreItem && item === 'lightball') {
    if (gen > 4) {
      // 100% ATK boost if "Light Ball" is held by a Pikachu (gen 5+)
      finalStats.atk = Math.floor(finalStats.atk * 2);
    }

    // 100% SPA boost if "Light Ball" is held by a Pikachu
    finalStats.spa = Math.floor(finalStats.spa * 2);
  }

  if (['marowak', 'cubone'].includes(baseForme) && !ignoreItem && item === 'thickclub') {
    // 100% ATK boost if "Thick Club" is held by a Marowak/Cubone
    finalStats.atk = Math.floor(finalStats.atk * 2);
  }

  if (baseForme === 'ditto' && !hasTransform && !ignoreItem) {
    if (item === 'quickpowder') {
      speedMods.push(2);
    } else if (item === 'metalpowder') {
      if (gen === 2) {
        // 50% DEF/SPD boost if "Metal Powder" is held by a Ditto (gen 2)
        finalStats.def = Math.floor(finalStats.def * 1.5);
        finalStats.spd = Math.floor(finalStats.spd * 1.5);
      } else {
        // 100% DEF boost if "Metal Powder" is held by a Ditto (gen 3+)
        finalStats.def = Math.floor(finalStats.def * 2);
      }
    }
  }

  // finished gen 2 abilities and items
  if (gen <= 2) {
    return finalStats;
  }

  const hasDynamax = 'dynamax' in pokemon.volatiles;

  // apply more item effects
  // (at this point, we should at least be gen 3)
  if (!ignoreItem) {
    if (item === 'choiceband' && !hasDynamax) {
      // 50% ATK boost if "Choice Band" is held
      finalStats.atk = Math.floor(finalStats.atk * 1.5);
    }

    if (item === 'choicespecs' && !hasDynamax) {
      // 50% SPA boost if "Choice Specs" is held
      finalStats.spa = Math.floor(finalStats.spa * 1.5);
    }

    if (item === 'choicescarf' && !hasDynamax) {
      speedMods.push(1.5);
    }

    if (item === 'assaultvest') {
      // 50% SPA boost if "Assault Vest" is held
      finalStats.spd = Math.floor(finalStats.spd * 1.5);
    }

    if (item === 'furcoat') {
      // 100% DEF boost if "Fur Coat" is held
      finalStats.def = Math.floor(finalStats.def * 2);
    }

    if (baseForme === 'clamperl') {
      if (item === 'deepseatooth') {
        // 100% SPA boost if "Deep Sea Tooth" is held by a Clamperl
        finalStats.spa = Math.floor(finalStats.spa * 2);
      } else if (item === 'deepseascale') {
        // 100% SPD boost if "Deep Sea Scale" is held by a Clamperl
        finalStats.spd = Math.floor(finalStats.spd * 2);
      }
    }

    if (item === 'souldew' && gen < 7 && ['latios', 'latias'].includes(baseForme)) {
      // 50% SPA/SPD boost if "Soul Dew" is held by a Latios/Latias (gens 3-6)
      finalStats.spa = Math.floor(finalStats.spa * 1.5);
      finalStats.spd = Math.floor(finalStats.spd * 1.5);
    }

    const speedReductionItems = [
      'ironball',
      ...PokemonSpeedReductionItems.map((i) => id(i)),
    ];

    if (speedReductionItems.includes(item)) {
      speedMods.push(0.5);
    }
  }

  if (['purepower', 'hugepower'].includes(ability)) {
    // 100% ATK boost if ability is "Pure Power" or "Huge Power"
    finalStats.atk = Math.floor(finalStats.atk * 2);
  }

  if (ability === 'hustle' || (ability === 'gorillatactics' && !hasDynamax)) {
    // 50% ATK boost if ability is "Hustle" or "Gorilla Tactics" (and not dynamaxed, for the latter only)
    finalStats.atk = Math.floor(finalStats.atk * 1.5);
  }

  // apply weather effects
  const weather = id(field.weather);

  const ignoreWeather = [
    ability,
    opponentAbility,
  ].filter(Boolean).some((a) => ['airlock', 'cloudnine'].includes(a));

  if (weather && !ignoreWeather) {
    // note: see WeatherMap in weather consts for the sanitized value
    // (e.g., `weather` will be `'sand'`, not `'sandstorm'`)
    if (weather === 'sand') {
      if (pokemon.types.includes('Rock')) {
        // 50% SPE boost if Rock type w/ darude sandstorm
        finalStats.spe = Math.floor(finalStats.spe * 1.5);
      }

      if (ability === 'sandrush') {
        speedMods.push(2);
      }
    }

    if (ability === 'slushrush' && weather === 'hail') {
      speedMods.push(2);
    }

    if (ignoreItem || item !== 'utilityumbrella') {
      if (['sun', 'harshsunshine'].includes(weather)) {
        if (ability === 'solarpower') {
          // 50% SPA boost if ability is "Solar Power", sunny/desolate, and Pokemon is NOT holding "Utility Umbrella"
          finalStats.spa = Math.floor(finalStats.spa * 1.5);
        } else if (ability === 'chlorophyll') {
          speedMods.push(2);
        }

        /**
         * @todo Implement ally Pokemon, notably Cherrim's "Flower Gift"
         */
      }
    }

    if (['rain', 'heavyrain'].includes(weather) && ability === 'swiftswim') {
      speedMods.push(2);
    }
  }

  // yoo when tf did they make me into an ability lmaooo
  if (ability === 'defeatist' && hpPercentage <= 0.5) {
    // 50% ATK/SPA reduction if ability is "Defeatist" and HP is 50% or less
    finalStats.atk = Math.floor(finalStats.atk * 0.5);
    finalStats.spa = Math.floor(finalStats.spa * 0.5);
  }

  // apply toggleable abilities
  if (pokemon.abilityToggled) {
    if ('slowstart' in pokemon.volatiles) {
      // 50% ATK/SPA reduction if ability is "Slow Start"
      finalStats.atk = Math.floor(finalStats.atk * 0.5);
      finalStats.spa = Math.floor(finalStats.spa * 0.5);
    }

    if (ability === 'unburden' && !item && 'itemremoved' in pokemon.volatiles) {
      speedMods.push(2);
    }

    /**
     * @todo implement ally Pokemon for "Minus" and "Plus" toggleable abilities
     */
  }

  // apply additional status effects
  if (pokemon.status) {
    if (ability === 'marvelscale') {
      // 50% DEF boost if ability is "Marvel Scale" and Pokemon is statused
      finalStats.def = Math.floor(finalStats.def * 1.5);
    }
  }

  // apply NFE (not fully evolved) effects
  const nfe = species?.evos?.some((evo) => {
    const evoSpecies = dex.species.get(evo);

    return !evoSpecies?.isNonstandard
      || evoSpecies?.isNonstandard === species.isNonstandard;
  });

  if (nfe) {
    if (!ignoreItem && item === 'eviolite') {
      // 50% DEF/SPD boost if "Eviolite" is held by an NFE Pokemon
      finalStats.def = Math.floor(finalStats.def * 1.5);
      finalStats.spd = Math.floor(finalStats.spd * 1.5);
    }
  }

  // apply terrain effects
  const terrain = id(field.terrain);

  if (ability === 'grasspelt' && terrain === 'grassy') {
    // 50% DEF boost if ability is "Grass Pelt" and terrain is of the grassy nature
    finalStats.def = Math.floor(finalStats.def * 1.5);
  } else if (ability === 'surgesurfer' && terrain === 'electric') {
    speedMods.push(2);
  }

  // apply player side conditions
  const fieldSideKey = playerKey === 'p1' ? 'attackerSide' : 'defenderSide';
  const playerSide = field[fieldSideKey];

  if (playerSide?.isTailwind) {
    speedMods.push(2);
  }

  if (playerSide?.isGrassPledge) {
    speedMods.push(0.25);
  }

  // calculate the product of all the speedMods
  const speedMod = speedMods.reduce((acc, mod) => acc * mod, 1);

  // apply the speedMod, rounding down on 0.5 and below
  // (unlike Math.round(), which rounds up on 0.5 and above)
  finalStats.spe *= speedMod;
  finalStats.spe = finalStats.spe % 1 > 0.5 ? Math.ceil(finalStats.spe) : Math.floor(finalStats.spe);

  return finalStats;
};
