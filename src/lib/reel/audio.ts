// src/lib/reel/audio.ts
// Modular audio layer — silent by default, swappable for future music packs.

export interface ReelAudioTrack {
  id: string
  localUri: string
  volume: number
}

export interface ReelAudioStrategy {
  id: string
  resolveTrack(): Promise<ReelAudioTrack | null>
}

export class SilentReelAudioStrategy implements ReelAudioStrategy {
  id = 'silent'

  async resolveTrack(): Promise<ReelAudioTrack | null> {
    return null
  }
}

let activeStrategy: ReelAudioStrategy = new SilentReelAudioStrategy()

export function setReelAudioStrategy(strategy: ReelAudioStrategy): void {
  activeStrategy = strategy
}

export function getReelAudioStrategy(): ReelAudioStrategy {
  return activeStrategy
}

export function buildAudioInputArg(track: ReelAudioTrack | null): string {
  if (!track) return ''
  return `-i "${track.localUri}"`
}

