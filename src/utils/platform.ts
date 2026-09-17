import { Capacitor } from '@capacitor/core'

export function getPlatform(): string {
  return Capacitor.getPlatform()
}

export function isAndroid(): boolean {
  return getPlatform() === 'android'
}