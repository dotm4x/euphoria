import { type Node } from '#/core/node/node.js'

import { type VoiceState } from '../descriptors/frame.js'
import { type ListenerDescriptor } from '../descriptors/listener.js'
import { type PlaybackDescriptor } from '../descriptors/playback.js'

/**
 * An object the playback module can sound.
 *
 * Entries describe themselves once per frame, and receive the state the backend
 * resolves for their voice. Nodes and objects outside the scene graph implement
 * it the same way, as bodies do for the simulation.
 */
export interface Playable {
  /** Stable identifier of the voice. */
  readonly identifier: string

  /**
   * Describes the voice for the frame that is being collected.
   *
   * @returns The voice, or undefined when the object is silent.
   */
  describe(): PlaybackDescriptor | undefined

  /**
   * Receives the state the backend resolved for this voice.
   *
   * @param state - State of the voice after the frame.
   */
  notifyVoice(state: VoiceState): void
}

/**
 * Chekcs whether a value can be sounded by the playback module.
 *
 * @param value - Value to inspect.
 * @returns Whether the value implements {@link Playable}.
 */
export function isPlayable(value: unknown): value is Playable {
  if (typeof value !== 'object' || value === null) return false
  if (!('identifier' in value)) return false

  return (
    'describe' in value &&
    typeof value.describe === 'function' &&
    'notifyVoice' in value &&
    typeof value.notifyVoice === 'function'
  )
}

/** An object that says where sound is heard from. */
export interface Listener {
  /**
   * Describes the ear for the frame that is being collected.
   *
   * @returns The listener, or undefined when it is not placed.
   */
  describeListener(): ListenerDescriptor | undefined
}

/**
 * Checks whether a value can act as the listener of a frame.
 *
 * @param value - Value to inspect.
 * @returns Whether the value implements {@link Listener}.
 */
export function isListener(value: unknown): value is Listener {
  if (typeof value !== 'object' || value === null) return false

  return 'describeListener' in value && typeof value.describeListener === 'function'
}

/** An entry of the playback module: something to sound or something to traverse. */
export type PlaybackEntry = Node | Playable
