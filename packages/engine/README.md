# Euphoria Engine

**Build worlds for the web.**

Euphoria Engine is the open game engine behind Euphoria: a modern runtime for
creating interactive experiences that run directly in the browser.

It is designed for two-dimensional and three-dimensional games, sharing one
scene composition model, one asset pipeline and one rendering pipeline, so a
project can grow without switching tools or rewriting its foundation.

## Features

- **2D and 3D** — Build sprites, panels and tilemaps, and light
  three-dimensional scenes with cameras, meshes, depth and dynamic lights.
- **Web-native** — Runs in the browser with no plugins, downloads or
  installations, on top of modern graphics APIs.
- **Composition over boilerplate** — Scenes are trees of nodes, and cameras,
  layers, effects and viewports are all nodes you can combine.
- **One asset pipeline** — Images, audio, fonts, shaders, text and binary data
  load, cache and reload through a common system.
- **Text with real fonts** — Font files rasterize once into an atlas, and text
  nodes lay them out with alignment, wrapping and scaling in two or three
  dimensions. Runs mix fonts, sizes and colors on the same line, so a bold word
  or a colored number costs no extra material.
- **Models from files** — glTF and GLB files become geometry and a node
  hierarchy, so a level can come from a modelling tool instead of a list of
  primitive calls.
- **Input that fits the game** — Keyboard, mouse, touches and gamepads feed named
  actions and axes, so the same movement code reads a stick, a key pair or a
  finger.
- **Built for real games** — Input, timing, scenes, rendering, audio and asset
  management ship together, with the same code in development and in production.
- **Sound that follows the scene** — Music, interface sounds and placed emitters
  inherit the transform of the node they hang from, mix through buses and fade
  with the distance to the camera.
- **Open and embeddable** — Apache 2.0 licensed, ready to be used on its own or
  integrated into your own projects.

## Development

> [!WARNING]
> Euphoria Engine is under active development. Two-dimensional rendering is
> mature and three-dimensional rendering is available with meshes, cameras,
> depth and dynamic lights; shadows, image-based lighting and advanced
> materials are still being built.
>
> Physics runs through the simulation module in two and three dimensions, with
> bodies, colliders, sensors, joints, contacts and ray casts resolved by Rapier.
>
> Audio plays through the playback module over the Web Audio API, with placed
> planar and spatial emitters, mixing buses and a null backend for servers and
> tests.
>
> Text draws from font atlases built through the Canvas API, with wrapping,
> alignment and scaling. Rich text styles and signed distance fields are still
> being built.
>
> Models load from glTF and GLB, with their hierarchy and material colors.
> Skinning, animations, morph targets and embedded images are not read yet.
>
> Input covers keyboard, mouse, touch and gamepad through named actions and
> axes. Virtual joysticks and haptic feedback are still being built.
>
> More information will be added as the engine progresses.

## License

This project is licensed under the [Apache License 2.0](../../LICENSE).
