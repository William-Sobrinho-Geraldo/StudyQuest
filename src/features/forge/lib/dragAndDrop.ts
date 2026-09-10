import type { DragEvent } from 'react'
import type { EquipmentSlot } from './forgeRules'

export const ITEM_DRAG_DATA_TYPE = 'text/plain'
export const ITEM_DRAG_SLOT_TYPE = 'application/x-item-slot'

export function beginItemDrag(event: DragEvent, itemId: string): void {
  event.dataTransfer.setData(ITEM_DRAG_DATA_TYPE, itemId)
  event.dataTransfer.effectAllowed = 'move'
}

export function setItemDragSlot(event: DragEvent, slot: EquipmentSlot): void {
  event.dataTransfer.setData(ITEM_DRAG_SLOT_TYPE, slot)
}

export function readItemDrag(event: DragEvent): string | null {
  const itemId = event.dataTransfer.getData(ITEM_DRAG_DATA_TYPE)
  return itemId || null
}

export function readItemSlotDrag(event: DragEvent): EquipmentSlot | null {
  const slot = event.dataTransfer.getData(ITEM_DRAG_SLOT_TYPE)
  if (slot === 'weapon' || slot === 'helmet' || slot === 'chest' || slot === 'boots') {
    return slot
  }
  return null
}