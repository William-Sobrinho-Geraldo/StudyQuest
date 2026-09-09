import { Footprints, HardHat, Shield, Sword, type LucideIcon } from 'lucide-react'
import type { EquipmentSlot } from '../lib/forgeRules'

export const SLOT_ICONS: Record<EquipmentSlot, LucideIcon> = {
  weapon: Sword,
  helmet: HardHat,
  chest: Shield,
  boots: Footprints,
}