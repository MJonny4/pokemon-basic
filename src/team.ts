import Alpine from 'alpinejs'
import './style.css'
import { registerTeamStore } from './store/team'
import { registerTeamLab } from './components/team/TeamLab'
import { registerSetEditor } from './components/team/SetEditor'

declare global {
    interface Window {
        Alpine: typeof Alpine
    }
}

registerTeamStore()
registerTeamLab()
registerSetEditor()

window.Alpine = Alpine
Alpine.start()
