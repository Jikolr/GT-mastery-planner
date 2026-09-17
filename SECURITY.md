# Security

Please report security issues privately to the repository owner rather than opening a public issue.

Do not include Guardian Tales account credentials, personal information, or unrelated local files in a report. This application does not require game-account credentials and stores planner data locally.

Include the visible application version/build ID, operating system, reproduction steps and impact. Treat recovery exports as private: they can contain your preset names and planner data.

Desktop renderer isolation and sandboxing are enabled, Node access is disabled in the renderer, and desktop builds have a restrictive Content Security Policy. Only the project's GitHub links may open externally; arbitrary navigation and permissions are blocked. Web share links are parsed as numeric levels, not executable content. Backups are size-limited and validated before confirmation.

Unsigned application downloads do not provide publisher authentication. Check release checksums for corruption, obtain packages only from the project release page, or build the matching tagged source yourself. Keep using the latest release for Electron/browser-runtime fixes. No automatic desktop updater or signing credentials are included.
