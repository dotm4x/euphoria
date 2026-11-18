import {
  type AudioClip,
  type AudioPlayer,
  type OneShotOptions,
  type PlaybackModule,
} from '@euphoria/engine'

import { type MyKeyboard } from '../runtime/input/devices/keyboard.js'

/** Keys, clips and devices the two audio scenes share. */
export interface AudioControlsOptions {
  /** Keyboard whose keys control the sound. */
  readonly keyboard: MyKeyboard
  /** Module that mixes the scene. */
  readonly playback: PlaybackModule
  /** Track toggled with the space bar. */
  readonly music: AudioPlayer
  /** Sound played with the coin key. */
  readonly coin: AudioClip
  /** Sound played with the thud key. */
  readonly thud: AudioClip
  /** Placement of a one-shot sound, decided by the scene. */
  readonly place: () => OneShotOptions
}

/**
 * Binds the keys both audio scenes use.
 *
 * Space starts and stops the music, M mutes everything, and C and T play
 * one-shot sounds where the scene says they belong.
 *
 * @param options - Keyboard, module, music and the clips of the scene.
 */
export function bindAudioControls({
  keyboard,
  playback,
  music,
  coin,
  thud,
  place,
}: AudioControlsOptions): void {
  keyboard.space.connect(({ down, repeat }) => {
    if (!down || repeat) return
    if (music.playing.value) music.stop()
    else music.play()
  })

  keyboard.mute.connect(({ down, repeat }) => {
    if (!down || repeat) return
    playback.muted.value = !playback.muted.value
  })

  keyboard.coin.connect(({ down, repeat }) => {
    if (!down || repeat) return
    playback.play(coin, place())
  })

  keyboard.thud.connect(({ down, repeat }) => {
    if (!down || repeat) return
    playback.play(thud, place())
  })
}

/**
 * Describes the state of the sound of a scene for the statistics panel.
 *
 * @param playback - Module of the scene, once resolved.
 * @param music - Track of the scene.
 * @returns The rows the panel shows.
 */
export function audioReadouts(
  playback: PlaybackModule | undefined,
  music: AudioPlayer,
): Iterable<readonly [string, string]> {
  const error = playback?.error.value
  const device = playback?.deviceState.value ?? 'idle'

  return [
    ['Sound', error === undefined ? describeDevice(device) : `error: ${error.message}`],
    ['Voices', String(playback?.stats.voices ?? 0)],
    ['Music', music.playing.value ? 'playing' : 'stopped'],
    ['Muted', playback?.muted.value === true ? 'yes' : 'no'],
    ['Keys', 'Space music · M mute · C coin · T thud'],
  ]
}

function describeDevice(device: string): string {
  return device === 'suspended' ? 'suspended · click to enable' : device
}
