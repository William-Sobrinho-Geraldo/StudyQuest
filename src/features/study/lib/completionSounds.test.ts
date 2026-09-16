import { beforeEach, describe, expect, it } from 'vitest'
import {
  SOUND_OPTIONS,
  getSelectedSoundKey,
  playCompletionSound,
  playPreviewSound,
  setSelectedSoundKey,
} from './completionSounds'

beforeEach(() => {
  localStorage.clear()
})

describe('completionSounds', () => {
  it('expõe as quatro opções temáticas de som', () => {
    expect(SOUND_OPTIONS.map((option) => option.key)).toEqual([
      'crystal_bell',
      'victory_fanfare',
      'magic_harp',
      'war_gong',
    ])
  })

  it('retorna o Sino de Cristal como padrão', () => {
    expect(getSelectedSoundKey()).toBe('crystal_bell')
  })

  it('persiste e recupera o som selecionado', () => {
    setSelectedSoundKey('war_gong')

    expect(getSelectedSoundKey()).toBe('war_gong')
    expect(localStorage.getItem('studyquest:completion-sound')).toBe('war_gong')
  })

  it('cai para o padrão quando o valor salvo é inválido', () => {
    localStorage.setItem('studyquest:completion-sound', 'nao-existe')

    expect(getSelectedSoundKey()).toBe('crystal_bell')
  })

  it('playCompletionSound e playPreviewSound não lançam erro sem áudio disponível', () => {
    expect(() => playCompletionSound()).not.toThrow()
    expect(() => playPreviewSound('magic_harp')).not.toThrow()
  })
})
