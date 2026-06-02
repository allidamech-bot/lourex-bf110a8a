# Legacy Pages Archive

This directory (`src/legacy-pages`) contains outdated, deprecated, and archive page components from older versions of the Lourex platform.

**IMPORTANT RULES:**
1. **DO NOT** import any file from this directory into active application code (`src/App.tsx`, active routes, or active components).
2. **DO NOT** reference these pages in router configurations or navigation menus without a thorough audit and refactoring to modern standards.
3. These files are preserved here solely as a historical reference. They may contain imports to deprecated services, outdated UI patterns, or hardcoded references that could break the application if loaded.
4. If you need functionality from these pages (e.g., Cart, Checkout, Marketplace), do not blindly reactivate these pages. Instead, reference their logic and rebuild them using the modern architecture.

These pages are currently safely quarantined and do not affect the main application bundle.
