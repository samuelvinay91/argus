# Changelog

## [1.4.0](https://github.com/RaphaEnterprises-AI/argus/compare/v1.3.0...v1.4.0) (2026-01-16)


### Features

* **dashboard:** add device auth page and UI improvements ([38b0b62](https://github.com/RaphaEnterprises-AI/argus/commit/38b0b628eebc382c0032f05f51614ce50a1a629f))
* **dashboard:** add MCP Sessions management page ([8eb74d7](https://github.com/RaphaEnterprises-AI/argus/commit/8eb74d7b1d92b294719d8f5a091bde4d6c7d2c8b))
* **dashboard:** unified organization context architecture ([c617311](https://github.com/RaphaEnterprises-AI/argus/commit/c617311cc618218f8e20d03ec6a0e87e9e44508e))


### Bug Fixes

* prevent AI from calling discoverElements multiple times ([53bc274](https://github.com/RaphaEnterprises-AI/argus/commit/53bc274083f4f0479bf3d9ef552b27a7d8f3bf2e))
* resolve console warnings and critical chat persistence bug ([eaceffd](https://github.com/RaphaEnterprises-AI/argus/commit/eaceffd6671f77904448f11ff583cf909669c9cc))

## [1.3.0](https://github.com/RaphaEnterprises-AI/argus/compare/v1.2.0...v1.3.0) (2026-01-14)


### Features

* **ui:** redesign sidebar with cleaner organization ([3bf95bd](https://github.com/RaphaEnterprises-AI/argus/commit/3bf95bd53ef1133afd175423781f5f8429d0eb5d))


### Bug Fixes

* add custom sign-in/sign-up pages to fix CORS errors ([5df1440](https://github.com/RaphaEnterprises-AI/argus/commit/5df1440c5a93cfa27e92584bacc3c1593c9d01eb))
* add explicit sign-out button to resolve session clearing issue ([8bbdc4c](https://github.com/RaphaEnterprises-AI/argus/commit/8bbdc4ca1558c7622528959edacde05c25e76a8b))
* add JWT auth token to org-switcher API calls ([53fff9f](https://github.com/RaphaEnterprises-AI/argus/commit/53fff9f766ba5ed5fd6972c06cf765a9abd66ae2))
* **auth:** implement global API client with Clerk authentication ([074522e](https://github.com/RaphaEnterprises-AI/argus/commit/074522e2e01054021fbd1eea6269ce02563c3e71))
* handle RSC prefetch requests to avoid CORS errors after sign-out ([3eaea08](https://github.com/RaphaEnterprises-AI/argus/commit/3eaea08d9bd6b235e5160b9af50778d8b3c8eb3c))
* prevent chat pane overflow during message streaming ([48e0655](https://github.com/RaphaEnterprises-AI/argus/commit/48e06555d102a3715ab5f973ab85c282f6c54a5e))
* remove argus-backend template from organization hook ([161cb86](https://github.com/RaphaEnterprises-AI/argus/commit/161cb863e6720f408c618ac610501c35075b98ee))
* remove non-existent Clerk JWT template to fix auth errors ([ad8c03c](https://github.com/RaphaEnterprises-AI/argus/commit/ad8c03cbd3915a3b583a4ee4d583e5e59c861e77))
* render markdown during streaming to prevent flash ([1c7e38a](https://github.com/RaphaEnterprises-AI/argus/commit/1c7e38a9a396c81efde5874514fbed516cc87cbd))
* **types:** resolve TypeScript errors in audit and team pages ([581aad3](https://github.com/RaphaEnterprises-AI/argus/commit/581aad35fecb80664bad38867e9d609f66a026ce))
* use direct backend URL to bypass Vercel rewrites stripping auth headers ([36715f2](https://github.com/RaphaEnterprises-AI/argus/commit/36715f2a159dccd417c5c2131dc75e7bfc6791f7))


### Performance Improvements

* improve dashboard UX and bundle size ([2d178cd](https://github.com/RaphaEnterprises-AI/argus/commit/2d178cdc71818fb19b4ed3f9ad91a51b65d7b210))

## [1.2.0](https://github.com/RaphaEnterprises-AI/argus/compare/v1.1.2...v1.2.0) (2026-01-13)


### Features

* add React hooks for settings page and rewrite settings UI ([b1d59ad](https://github.com/RaphaEnterprises-AI/argus/commit/b1d59adea5d26e717022f3e55102fc0cfd5eb9da))
* switch to Devicon CDN for comprehensive icon support ([94de45f](https://github.com/RaphaEnterprises-AI/argus/commit/94de45fbe1de13de7957e4b817f35a48a20e6403))


### Bug Fixes

* improve Clerk user menu and profile page visibility ([60880e8](https://github.com/RaphaEnterprises-AI/argus/commit/60880e82c3b6da50ad9544a3d9242cd2b4684e89))
* replace AWS/Azure with Docker/Kubernetes icons ([cc10fdc](https://github.com/RaphaEnterprises-AI/argus/commit/cc10fdce62792c8ff3f78d9674b9b2c47981fb79))
* use brand colors for icons that don't support custom colors ([1811b5c](https://github.com/RaphaEnterprises-AI/argus/commit/1811b5c27c00251d40eaa35ca994cc0df3cd47de))

## [1.1.2](https://github.com/RaphaEnterprises-AI/argus/compare/v1.1.1...v1.1.2) (2026-01-12)


### Bug Fixes

* **ci:** use PAT for release-please to trigger other workflows ([30c2b23](https://github.com/RaphaEnterprises-AI/argus/commit/30c2b2307dd91fe4153637e877a09e1ca8a8610d))
* resolve landing page console errors ([267b4e5](https://github.com/RaphaEnterprises-AI/argus/commit/267b4e50bbe7eaa210d64abfa86304c312f34fa9))
* standardize package description casing ([f3aa4e6](https://github.com/RaphaEnterprises-AI/argus/commit/f3aa4e669791c6b442422a36bd2a5004fdd2bbaa))

## [1.1.1](https://github.com/RaphaEnterprises-AI/argus/compare/v1.1.0...v1.1.1) (2026-01-12)

### Bug Fixes

* **Clerk Login Form**: Improve button visibility in dark theme
  * Use explicit hex colors instead of CSS variables for Clerk components
  * Add white text color to primary buttons for better contrast
  * Style social login buttons with proper dark theme colors
  * Add consistent styling for inputs, labels, and dividers

## [1.1.0](https://github.com/RaphaEnterprises-AI/argus/compare/v1.0.0...v1.1.0) (2026-01-12)

### Features

* Add light/dark/system theme switching with next-themes
* Add ThemeToggle component in sidebar footer
* Add MobileThemeToggle in mobile header
* Implement scroll-to-active menu item in sidebar

### Bug Fixes

* Fix viewport metadata warnings by moving themeColor to viewport export

## [1.0.0](https://github.com/samuelvinay91/e2e-testing-agent/releases/tag/v1.0.0) (2025-01-07)

### Features

* Initial release of Argus Dashboard
* AI-powered E2E testing platform UI
* Test management and execution dashboard
* Real-time test monitoring
* Integration with Supabase backend
* Clerk authentication
* Dark theme UI
