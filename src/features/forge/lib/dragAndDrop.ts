import type { DragEvent } from 'react'

export const ITEM_DRAG_DATA_TYPE = 'text/plain'

export function beginItemDrag(event: DragEvent, itemId: string): void {
  event.dataTransfer.setData(ITEM_DRAG_DATA_TYPE, itemId)
  event.dataTransfer.effectAllowed = 'move'
}

export function readItemDrag(event: DragEvent): string | null {
  const itemId = event.dataTransfer.getData(ITEM_DRAG_DATA_TYPE)
  return itemId || null
}