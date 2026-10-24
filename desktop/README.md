# RPS desktop update channel

Signed release metadata for the Windows Vencord RichPresenceStudio plugin. Android plugin updates remain independent.

Version 0.3.0 adds automatic checks at launch and every six hours, an opt-out, and an installation button in Vencord → Plugins → RichPresenceStudio and the RPS editor → Updates. The upstream Vencord bundle updater stays disabled to preserve custom plugins.

The client verifies an Ed25519-signed manifest, pinned repository release URL, download size and SHA-256 before starting the installer. Installation requires the user's click; Discord closes and the helper waits for exit, invokes the existing transactional installer, then restarts Discord. Other Discord channels must be closed. Unknown or modified builds are refused instead of being overwritten. Custom builds require their matching source tree and build dependencies. The original source checkout is retained and must remain available for subsequent rebuilds.

Settings, user plugins, rollback journals and the installer's ownership hashes are retained through the existing installer engine. An update failure is recorded in `%USERPROFILE%/.rps-studio/update-error.txt`. Repair/removal remain available in the installer.

Release assets include the installer and corresponding GPL source archive. The private release-signing key is not stored in this repository. `latest.json` signs its exact UTF-8 payload string. Publish release assets first, then publish the signed manifest. Never replace an existing release binary in place: increment the desktop version.
