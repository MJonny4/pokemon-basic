import { registerStore as registerPokemonStore } from './alpine/stores/pokemon'
import { registerTeamStore } from './alpine/stores/team'

import { registerSearchBar } from './alpine/components/pokedex/search-bar'
import { registerModal } from './alpine/components/pokedex/modal'

import { registerStatsPokemonModal } from './alpine/components/stats/stats-pokemon-modal'
import './alpine/components/stats/stats-ranking'

import { registerTeamLab } from './alpine/components/team/team-lab'
import { registerSetEditor } from './alpine/components/team/set-editor'
import { registerBattleSim } from './alpine/components/team/battle-sim'

export default () => {
    registerPokemonStore()
    registerTeamStore()

    registerSearchBar()
    registerModal()

    registerStatsPokemonModal()

    registerTeamLab()
    registerSetEditor()
    registerBattleSim()
}