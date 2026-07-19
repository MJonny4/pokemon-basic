import { registerStore as registerPokemonStore } from './alpine/stores/pokemon'
import { registerTeamStore } from './alpine/stores/team'
import { registerThemeStore } from './alpine/stores/theme'

import { registerSearchBar } from './alpine/components/pokedex/search-bar'
import { registerModal } from './alpine/components/pokedex/modal'
import { registerNavMenu } from './alpine/components/layout/nav-menu'

import { registerStatsPokemonModal } from './alpine/components/stats/stats-pokemon-modal'
import { registerStatsRanking } from './alpine/components/stats/stats-ranking'

import { registerTeamLab } from './alpine/components/team/team-lab'
import { registerSetEditor } from './alpine/components/team/set-editor'
import { registerBattleSim } from './alpine/components/team/battle-sim'

import { registerGuide } from './alpine/components/guide/guide'

import { registerMovesIndex } from './alpine/components/moves/moves-index'
import { registerMoveDetail } from './alpine/components/moves/move-detail'
import { registerItemsIndex } from './alpine/components/items/items-index'
import { registerItemDetail } from './alpine/components/items/item-detail'
import { registerPokedexIndex } from './alpine/components/pokedex/pokedex-index'
import { registerPokedexDetail } from './alpine/components/pokedex/pokedex-detail'
import { registerTypeQuiz } from './alpine/components/types/type-quiz'

const uses = (name: string) => !!document.querySelector(`[x-data="${name}"]`)

export default () => {
    // Stores are always registered — they're lightweight and shared
    registerPokemonStore()
    registerTeamStore()
    registerThemeStore()

    // searchBar, modal, and navMenu are always registered — they live in the global Layout/SiteHeader
    registerSearchBar()
    registerModal()
    registerNavMenu()

    if (uses('statsPokemonModal')) registerStatsPokemonModal()
    if (uses('statsRanking'))      registerStatsRanking()

    if (uses('teamLab'))           registerTeamLab()
    if (uses('setEditor'))         registerSetEditor()
    if (uses('battleSim'))         registerBattleSim()

    if (uses('guide'))             registerGuide()

    if (uses('movesIndex'))        registerMovesIndex()
    if (uses('moveDetail'))        registerMoveDetail()
    if (uses('itemsIndex'))        registerItemsIndex()
    if (uses('itemDetail'))        registerItemDetail()

    if (uses('pokedexIndex'))      registerPokedexIndex()
    if (uses('pokedexDetail'))     registerPokedexDetail()

    if (uses('typeQuiz'))          registerTypeQuiz()
}
