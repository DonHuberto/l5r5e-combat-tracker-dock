# L5R5e Combat Tracker Dock 0.1.1 — portrait layout update

This release adjusts the visual presentation after testing feedback while keeping the module's clean-room implementation and privacy boundary intact.

## Changes relative to 0.1.0 and the original reference dock

- The dock is now attached to the top edge by default, matching the preferred placement of the reference experience.
- Added a client setting to switch a docked tracker between the top and bottom screen edges.
- Actor portrait artwork is now the default image source, replacing the cropped Token artwork that showed only a fragment of the character image.
- The default portrait width increases from 84 px to 128 px, and the portrait aspect increases from 1.25 to 1.5.
- Auto-fit can use 92% of the window width and never shrinks a portrait below 72 px.
- Combatant information is presented as layered overlays on an image-first portrait card, closer to the original dock's hierarchy instead of a narrow image with a separate body underneath.
- The toolbar and dock shell use a lighter, transparent presentation so individual portrait cards remain the visual focus.
- Active combatants grow and receive a stronger gold highlight without changing initiative order.
- The top Foundry UI is hidden by default while the top-docked tracker is visible; this remains configurable per client.

No reference source code or assets were copied. Initiative, privacy, event, removal, and late-arrival behavior is unchanged from 0.1.0.
