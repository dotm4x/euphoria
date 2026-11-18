import { mountRuntime, type RuntimeOptions } from '../runtime/runtime.js'

/** Runtime options a story sets, without the container the helper creates. */
export type StoryRuntimeOptions = Omit<RuntimeOptions, 'container'>

/**
 * Mounts an engine runtime for a story.
 *
 * The returned element is handed to Storybook synchronously; the runtime fills
 * it once the browser has loaded the engine, its textures and, when needed, the
 * simulation backends.
 *
 * @param options - Story scene, canvas size and simulation backends.
 * @returns The element the runtime mounts into.
 */
export function mountStory(options: StoryRuntimeOptions): HTMLElement {
  const container = document.createElement('div')
  container.style.cssText = 'display:flex;flex-direction:column;gap:0.75rem;padding:1rem'
  void mountRuntime({ ...options, container }).catch((error: unknown) => {
    console.error(error)
    container.append(textOf(error instanceof Error ? error.message : String(error)))
  })

  return container
}

function textOf(message: string): HTMLElement {
  const element = document.createElement('pre')
  element.textContent = message
  element.style.color = '#ff8b8b'

  return element
}
