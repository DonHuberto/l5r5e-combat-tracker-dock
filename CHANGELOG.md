# Changelog

## 0.1.1 - 2026-07-16

- Move the dock to the top edge by default and add a client-side top/bottom edge setting.
- Use Actor portrait artwork by default instead of cropped Token artwork.
- Increase the default portrait width to 128 px and the portrait aspect to 1.5.
- Rework portrait cards into image-first overlays inspired by the original dock's visual hierarchy while preserving the independent implementation and privacy-safe view-model.
- Increase auto-fit space and its minimum portrait width so information remains legible.
- Make conflicting top-UI hiding the default for the new top-docked layout.

## 0.1.0 - 2026-07-16

- Initial Foundry VTT 14 dock, portrait carousel, settings and responsive layouts.
- Privacy-safe L5R5e character, adversary, minion and army adapters with configurable descriptive state profiles.
- Native Combat initiative/turn controls, effect display, action/movement signals and group badges.
- Persistent global event schedule, conflict setup, visibility policies, chat cards and JournalEntry templates.
- Expandable future-round horizon with late-arrival projections.
- Authoritative dead/defeated-minion cleanup, Withdraw history and native participant creation.
- English/Polish localization, automated tests, validation, build and release packaging.
- Requires the separate L5R5e `1.14.103` late-arrival backend patch.
