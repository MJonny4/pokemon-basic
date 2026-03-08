import { TYPES, EFFECTIVENESS } from '../data/constants'

export interface DefenseProfile {
    quad: string[]
    double: string[]
    half: string[]
    quarter: string[]
    immune: string[]
}

export function calcDefenseProfile(pokemonTypes: string[]): DefenseProfile {
    const result: DefenseProfile = { quad: [], double: [], half: [], quarter: [], immune: [] }
    TYPES.forEach((atk) => {
        let mult = 1
        pokemonTypes.forEach((def) => {
            const idx = TYPES.indexOf(def.charAt(0).toUpperCase() + def.slice(1))
            mult *= EFFECTIVENESS[atk][idx]
        })
        if (mult === 4) result.quad.push(atk)
        else if (mult === 2) result.double.push(atk)
        else if (mult === 0.5) result.half.push(atk)
        else if (mult === 0.25) result.quarter.push(atk)
        else if (mult === 0) result.immune.push(atk)
    })
    return result
}
