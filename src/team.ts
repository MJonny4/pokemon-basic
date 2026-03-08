import Alpine from 'alpinejs'
import './style.css'
import { registerTeamStore } from './store/team'
import { registerTeamLab } from './components/team/TeamLab'
import { registerSetEditor } from './components/team/SetEditor'
import { registerBattleSim } from './components/team/BattleSim'

declare global {
    interface Window {
        Alpine: typeof Alpine
    }
}

registerTeamStore()
registerTeamLab()
registerSetEditor()
registerBattleSim()

window.Alpine = Alpine
Alpine.start()
