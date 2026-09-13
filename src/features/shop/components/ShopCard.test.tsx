import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShopCard, ShopStats } from './ShopCard'
import type { ShopSlot } from '../lib/shopItems'

function makeSlot(overrides: Partial<ShopSlot> = {}): ShopSlot {
  return {
    slot: 1,
    rarity: 'common',
    item_category: 'weapon',
    item_level: 30,
    name: 'Lâmina de Estudo',
    attack: 60,
    defense: 0,
    hp: 0,
    price: 240,
    bought: false,
    ...overrides,
  }
}

describe('ShopCard', () => {
  it('renders item name, rarity chip, level and price', () => {
    const slot = makeSlot()
    render(
      <ShopCard
        slot={slot}
        gold={500}
        busy={false}
        expired={false}
        canAfford={true}
        onBuy={vi.fn()}
        onDetail={vi.fn()}
      />,
    )
    expect(screen.getByText('Lâmina de Estudo')).toBeInTheDocument()
    expect(screen.getByText('Comum')).toBeInTheDocument()
    expect(screen.getByText('Nível 30')).toBeInTheDocument()
    expect(screen.getByText('240')).toBeInTheDocument()
  })

  it('shows the Avatar badge and rarity for the avatar slot', () => {
    const slot = makeSlot({
      slot: 6,
      item_category: 'avatar',
      name: 'lendario_1',
      rarity: 'legendary',
      item_level: 0,
      attack: 0,
      defense: 0,
      hp: 0,
      price: 3600,
    })
    render(
      <ShopCard
        slot={slot}
        gold={5000}
        busy={false}
        expired={false}
        canAfford={true}
        onBuy={vi.fn()}
        onDetail={vi.fn()}
      />,
    )
    expect(screen.getByText('Avatar')).toBeInTheDocument()
    expect(screen.getByText('Lendário')).toBeInTheDocument()
  })

  it('calls onBuy with slot number when buy button is clicked', async () => {
    const user = userEvent.setup()
    const onBuy = vi.fn()
    const slot = makeSlot({ price: 100 })
    render(
      <ShopCard
        slot={slot}
        gold={500}
        busy={false}
        expired={false}
        canAfford={true}
        onBuy={onBuy}
        onDetail={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /comprar/i }))
    expect(onBuy).toHaveBeenCalledWith(1)
  })

  it('displays Comprado badge and disables buy when slot is bought', () => {
    const slot = makeSlot({ bought: true })
    render(
      <ShopCard
        slot={slot}
        gold={500}
        busy={false}
        expired={false}
        canAfford={true}
        onBuy={vi.fn()}
        onDetail={vi.fn()}
      />,
    )
    expect(screen.getByText('Comprado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /comprar/i })).not.toBeInTheDocument()
  })

  it('disables buy button when player cannot afford the item', () => {
    const slot = makeSlot({ price: 500 })
    render(
      <ShopCard
        slot={slot}
        gold={100}
        busy={false}
        expired={false}
        canAfford={false}
        onBuy={vi.fn()}
        onDetail={vi.fn()}
      />,
    )
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
  })

  it('disables buy button when shop is expired', () => {
    const slot = makeSlot()
    render(
      <ShopCard
        slot={slot}
        gold={500}
        busy={false}
        expired={true}
        canAfford={true}
        onBuy={vi.fn()}
        onDetail={vi.fn()}
      />,
    )
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
  })

  it('renders the avatar image for avatar slots', () => {
    const slot = makeSlot({
      slot: 6,
      item_category: 'avatar',
      name: 'epico_6',
      rarity: 'epic',
      item_level: 0,
      attack: 0,
      defense: 0,
      hp: 0,
      price: 840,
    })
    render(
      <ShopCard
        slot={slot}
        gold={1000}
        busy={false}
        expired={false}
        canAfford={true}
        onBuy={vi.fn()}
        onDetail={vi.fn()}
      />,
    )
    expect(screen.getByText('Estrategista')).toBeInTheDocument()
    expect(screen.getByText('Avatar Premium')).toBeInTheDocument()
    const img = screen.getByRole('img', { name: 'Estrategista' })
    expect(img).toHaveAttribute('src', '/assets/avatars/epico_6.webp')
  })

  it('shows the Especial badge on the special slot', () => {
    const slot = makeSlot({ slot: 1, rarity: 'epic' })
    render(
      <ShopCard
        slot={slot}
        gold={1000}
        busy={false}
        expired={false}
        canAfford={true}
        isSpecial
        onBuy={vi.fn()}
        onDetail={vi.fn()}
      />,
    )
    expect(screen.getByText(/especial/i)).toBeInTheDocument()
  })
})

describe('ShopStats', () => {
  it('renders attack stat for weapon', () => {
    const slot = makeSlot({ item_category: 'weapon', attack: 60, defense: 0, hp: 0 })
    render(<ShopStats slot={slot} />)
    expect(screen.getByText('60')).toBeInTheDocument()
    expect(screen.getByText('ATQ')).toBeInTheDocument()
  })

  it('renders defense stat for helmet', () => {
    const slot = makeSlot({ item_category: 'helmet', attack: 0, defense: 30, hp: 0 })
    render(<ShopStats slot={slot} />)
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('DEF')).toBeInTheDocument()
  })

  it('renders HP stat for chest', () => {
    const slot = makeSlot({ item_category: 'chest', attack: 0, defense: 0, hp: 300 })
    render(<ShopStats slot={slot} />)
    expect(screen.getByText('300')).toBeInTheDocument()
    expect(screen.getByText('HP')).toBeInTheDocument()
  })
})