import Alpine from 'alpinejs'
import './style.css'
import { registerBattleSimulator } from './components/BattleSimulator'

declare global {
    interface Window {
        Alpine: typeof Alpine
    }
}

registerBattleSimulator()

window.Alpine = Alpine
Alpine.start()
