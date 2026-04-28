import { registerStore as registerPokemonStore } from './alpine/stores/pokemon'
import { registerTeamStore } from './alpine/stores/team'

import { registerSearchBar } from './alpine/components/pokedex/search-bar'
import { registerModal } from './alpine/components/pokedex/modal'

import { registerStatsPokemonModal } from './alpine/components/stats/stats-pokemon-modal'
import { registerStatsRanking } from './alpine/components/stats/stats-ranking'

import { registerTeamLab } from './alpine/components/team/team-lab'
import { registerSetEditor } from './alpine/components/team/set-editor'
import { registerBattleSim } from './alpine/components/team/battle-sim'

import { registerGuide } from './alpine/components/guide/guide'

const uses = (name: string) => !!document.querySelector(`[x-data="${name}"]`)

export default () => {
    // Stores are always registered — they're lightweight and shared
    registerPokemonStore()
    registerTeamStore()

    // Components are registered only if the page actually uses them
    if (uses('searchBar'))         registerSearchBar()
    if (uses('modal'))             registerModal()

    if (uses('statsPokemonModal')) registerStatsPokemonModal()
    if (uses('statsRanking'))      registerStatsRanking()

    if (uses('teamLab'))           registerTeamLab()
    if (uses('setEditor'))         registerSetEditor()
    if (uses('battleSim'))         registerBattleSim()

    if (uses('guide'))             registerGuide()
}
