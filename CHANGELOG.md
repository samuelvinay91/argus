# Changelog

## [2.0.0](https://github.com/RaphaEnterprises-AI/argus/compare/v1.6.0...v2.0.0) (2026-02-05)


### ⚠ BREAKING CHANGES

* **chat:** Migrate from AI SDK v4 to v6

### Features

* add Apollo.io website tracking ([a7c59d5](https://github.com/RaphaEnterprises-AI/argus/commit/a7c59d5d71cbd1bdc45a030bc5edb60fb67b12e4))
* add ReB2B analytics tracking script ([dd14916](https://github.com/RaphaEnterprises-AI/argus/commit/dd149162ae274703d1d74328a03fbda270851f94))
* add signed URL support for authenticated screenshot access ([568e5cd](https://github.com/RaphaEnterprises-AI/argus/commit/568e5cd371ceefe2fd440f974cbcca1fde6a4957))
* **ai:** add OpenRouter models hook and expand provider support ([33afb5a](https://github.com/RaphaEnterprises-AI/argus/commit/33afb5a11da3b4e7fc88390de95f362d603cba48))
* **api:** complete API layer migration for all remaining domains (Phases 3-6) ([31440a7](https://github.com/RaphaEnterprises-AI/argus/commit/31440a7cf4f28eabadae480545521c293ec133ad))
* **api:** migrate Discovery and Projects domains to backend API (Phase 2) ([b7d1fa4](https://github.com/RaphaEnterprises-AI/argus/commit/b7d1fa4c16b05920d21b8db8d61eda5066eeaead))
* **api:** migrate tests and test-runs hooks to backend API ([b6374fc](https://github.com/RaphaEnterprises-AI/argus/commit/b6374fc9dbbfc7cf8f2461b77ef029db29744c7b))
* **branding:** add favicon and app icons ([aea2eab](https://github.com/RaphaEnterprises-AI/argus/commit/aea2eab648ebaf0629241a389305bd3c6565078b))
* BYOK AI settings UI and chat enhancements ([c84751a](https://github.com/RaphaEnterprises-AI/argus/commit/c84751aed22e4b938cf024ddc88588f86e9a5949))
* **chat:** add search and provider grouping to model selector ([89c4116](https://github.com/RaphaEnterprises-AI/argus/commit/89c41161c48f0cca38d23de38b8cb3022e717410))
* **chat:** add visual comparison, test export, and knowledge graph cards ([c8ee1ae](https://github.com/RaphaEnterprises-AI/argus/commit/c8ee1ae9e4fc96fa823bc7b290cc28c33a716d10))
* **chat:** adopt Vercel AI Elements for model selector ([9c8b2ce](https://github.com/RaphaEnterprises-AI/argus/commit/9c8b2ce2caaf4457c57af8a5dde002d92393b1b3))
* **chat:** Claude-style artifacts panel, regenerate, and edit capabilities ([ac91195](https://github.com/RaphaEnterprises-AI/argus/commit/ac911951837c3e908b87c6e20a78e4067c875a62))
* **chat:** enhance model selector with capability badges ([2e05105](https://github.com/RaphaEnterprises-AI/argus/commit/2e051051c813b855765d85b55a78c38fba1e8eca))
* **chat:** modular next-gen chat interface with settings panel ([ea44f7c](https://github.com/RaphaEnterprises-AI/argus/commit/ea44f7cd39a3c1d24ca3a224dcfeeffb218e71e5))
* **chat:** switch to ChatWorkspace glassmorphic interface ([b8a6d09](https://github.com/RaphaEnterprises-AI/argus/commit/b8a6d090c4c25aa4cc7dadda04e5167e8e4a3f63))
* **chat:** upgrade to AI SDK v6 with parts-based message format ([387ee3f](https://github.com/RaphaEnterprises-AI/argus/commit/387ee3f46233e237c65651e54525caae77289379))
* **correlations:** add SDLC correlation dashboard UI (RAP-87) ([b086a18](https://github.com/RaphaEnterprises-AI/argus/commit/b086a18c503823f279b1f8b7a8d71346516f4f23))
* **dashboard:** add 7 new testing sections with AI-driven insights ([603cfa0](https://github.com/RaphaEnterprises-AI/argus/commit/603cfa088808940cc0f3640928243d4d5a5aa550))
* **dashboard:** add AI Hub with multi-persona settings interface ([80187bc](https://github.com/RaphaEnterprises-AI/argus/commit/80187bcbc7102d6311cfe01ac464d19ffc55c5e3))
* **dashboard:** add backend API migration foundation with feature flags ([3e82385](https://github.com/RaphaEnterprises-AI/argus/commit/3e82385f6154e29771cf406651e12b2055abb237))
* **dashboard:** add debug logging for API migration paths ([db5dcaf](https://github.com/RaphaEnterprises-AI/argus/commit/db5dcafd30a0664bc3685ba2efddeef2578adbe5))
* **dashboard:** add plugin events, integrations, and fix TypeScript errors ([4bf60c7](https://github.com/RaphaEnterprises-AI/argus/commit/4bf60c77f77becc5843895b324c0609d3df41885))
* **dashboard:** display AI analysis in Schedule Run History ([7160aab](https://github.com/RaphaEnterprises-AI/argus/commit/7160aabe5c40b1ba855a6c9fb894168578284b15))
* **dashboard:** Mobile-responsive PWA overhaul ([#11](https://github.com/RaphaEnterprises-AI/argus/issues/11)) ([d5a9778](https://github.com/RaphaEnterprises-AI/argus/commit/d5a9778da27db50a63b11c8992788fa87bf4424b))
* **design:** universal design language with light theme default ([7c0c91d](https://github.com/RaphaEnterprises-AI/argus/commit/7c0c91d6db570ad0a9b08963d408675d97ff0356))
* **discovery:** fix SSE event handling and add cloud settings persistence ([a9e8bd7](https://github.com/RaphaEnterprises-AI/argus/commit/a9e8bd72ff021d7e80bb7fbf655eac542f03da3c))
* improve dashboard robustness and test coverage ([1632543](https://github.com/RaphaEnterprises-AI/argus/commit/163254367793e2e279595eb9519742ca31aa37f7))
* **infra:** add comprehensive AI/LLM dashboard with provider health monitoring ([77101a9](https://github.com/RaphaEnterprises-AI/argus/commit/77101a9ab86e7fb5bc98472bca3158dda56d0830))
* **infra:** add Monitoring tab with Grafana/Prometheus/AlertManager status ([0186dc7](https://github.com/RaphaEnterprises-AI/argus/commit/0186dc7e9b16a668917b17996452b65f5fe81708))
* **infra:** add System Health tab with data layer health monitoring ([8b686c0](https://github.com/RaphaEnterprises-AI/argus/commit/8b686c0f3f0215262bb5a7e38c3d4fce681fc543))
* **integrations:** complete OAuth callback handling in frontend ([06ad749](https://github.com/RaphaEnterprises-AI/argus/commit/06ad749dfb63b797dda28841c3bc321ace686a3e))
* **monitoring:** add direct links to Grafana, Prometheus, AlertManager ([7868601](https://github.com/RaphaEnterprises-AI/argus/commit/786860151d2d618eb89ebe8a41356b106823be74))
* **nav:** add AI Hub link to main sidebar navigation ([79fc0bb](https://github.com/RaphaEnterprises-AI/argus/commit/79fc0bbadc4a4206c735c6c4c1c59308bec10e72))
* **schedules:** add real-time SSE streaming and backend API integration ([b1d5a2f](https://github.com/RaphaEnterprises-AI/argus/commit/b1d5a2f78aba86f5ff8506cf801f233d06495f91))
* **sentry:** add Sentry error monitoring and performance tracking ([adbdd37](https://github.com/RaphaEnterprises-AI/argus/commit/adbdd372810c9cd1f16fb425b0d66b520a6f1327))
* **settings:** comprehensive profile enhancement with new sections ([1d8bf8b](https://github.com/RaphaEnterprises-AI/argus/commit/1d8bf8b5d8cc9ece9c0463c135e14d33f1a381c4))
* **sidebar:** reorganize navigation with collapsible sections and icon-only mode ([967f156](https://github.com/RaphaEnterprises-AI/argus/commit/967f156a2156ac41ad18deb8fa85ba1d2d0c35eb))
* **tests:** add session replay with video and screenshot slideshow ([9830c91](https://github.com/RaphaEnterprises-AI/argus/commit/9830c91c7d700928ca5b3efd0f13c16e453d4bda))
* **tests:** enhance test run detail page with comprehensive UI components ([c65a03f](https://github.com/RaphaEnterprises-AI/argus/commit/c65a03f26af5ffc45489c9231aa0f2d2f4d146d5))
* **tests:** integrate all new components into test run detail page ([5dbc0d7](https://github.com/RaphaEnterprises-AI/argus/commit/5dbc0d7477cdcf9f7720da86da58a6211e60566c))
* update integrations page for 57 platforms ([3a99049](https://github.com/RaphaEnterprises-AI/argus/commit/3a99049bb9b2fcd9a4b614d717ebcd82b67a9807))
* **ux:** add loading.tsx skeletons to all pages for instant feedback ([45f63c1](https://github.com/RaphaEnterprises-AI/argus/commit/45f63c11ef475b1815da4b1454c394097e6b9f8e))
* **visual-ai:** complete Visual AI feature with real backend integrations ([d9edd2a](https://github.com/RaphaEnterprises-AI/argus/commit/d9edd2a9d7540dab39559e79026e3d9ffbc30bcd))


### Bug Fixes

* **a11y:** add accessibility features to custom modals ([11bfbf7](https://github.com/RaphaEnterprises-AI/argus/commit/11bfbf7ad798e11fd965a1752bdd743c18ad20a4))
* **a11y:** add missing DialogDescription and SheetDescription elements ([d9bba4a](https://github.com/RaphaEnterprises-AI/argus/commit/d9bba4a776cb2628f965e7152281a3df90a3af9a))
* add aplo-evnt.com and pro.ip-api.com to CSP connect-src ([18c3504](https://github.com/RaphaEnterprises-AI/argus/commit/18c3504c0b8617292cf4102c12e529f7044b4114))
* add centralized screenshot URL resolver for broken R2 URLs ([8e1d726](https://github.com/RaphaEnterprises-AI/argus/commit/8e1d726e54e749232074663d8c65f6160229f1fc))
* add cross-tab sync and LRU cache for better state management ([f793b1f](https://github.com/RaphaEnterprises-AI/argus/commit/f793b1fca6151ee8a14b186a2272a0a1bd42c00b))
* add missing lucide-react imports (FileText, Activity) ([085e2ba](https://github.com/RaphaEnterprises-AI/argus/commit/085e2ba14d8fd18c6056e85261fff8b4c3c44e27))
* add models.dev to CSP connect-src for model logos ([5263718](https://github.com/RaphaEnterprises-AI/argus/commit/5263718d35975669ed7e849d118e4e177b7896ce))
* add ReB2B and Apollo.io to CSP connect-src ([34c9d07](https://github.com/RaphaEnterprises-AI/argus/commit/34c9d071c7d4572ce68a93d882409947e67ac0aa))
* add ReB2B and Apollo.io to CSP script-src ([85e3564](https://github.com/RaphaEnterprises-AI/argus/commit/85e356448f43b1e44261a21b545cd67c03b9ce53))
* **ai-hub:** add defensive array checks to prevent filter errors ([07a47a3](https://github.com/RaphaEnterprises-AI/argus/commit/07a47a3b3c8667d62501170c382175df2feb5ce9))
* **ai-hub:** add defensive Array.isArray() checks to prevent crashes ([45dfd10](https://github.com/RaphaEnterprises-AI/argus/commit/45dfd105953a07ddc9f34b2374ecfc9f1eca7c20))
* **ai-hub:** fix layout issues and add missing Models page ([080123c](https://github.com/RaphaEnterprises-AI/argus/commit/080123cb9c3eb2a5819d4dc3a096acae94c41659))
* **ai-hub:** handle missing backend API endpoints gracefully ([e724de8](https://github.com/RaphaEnterprises-AI/argus/commit/e724de8b60932c01ca07e76d3c0a4920d800d0c5))
* **ai-hub:** improve accessibility, error handling, and memory management ([3377164](https://github.com/RaphaEnterprises-AI/argus/commit/33771645a6eadbd2071e3fa102f8beb76ab13f28))
* **ai-hub:** use health check status for provider badges ([fbf7351](https://github.com/RaphaEnterprises-AI/argus/commit/fbf7351037906540bf9c336355dc14b83cc192ff))
* **api-client:** add snake_case to camelCase conversion for API responses ([9489582](https://github.com/RaphaEnterprises-AI/argus/commit/9489582314bee55db7525c70ccf0225acaafd931))
* **api:** add global camelCase to snake_case conversion for backend ([77ebcd6](https://github.com/RaphaEnterprises-AI/argus/commit/77ebcd632b8a5058e0f8cb9ba90cf3d35b7fce04))
* **api:** properly handle Pydantic validation errors ([1318eba](https://github.com/RaphaEnterprises-AI/argus/commit/1318eba17d09db523a996b529a863a369dab80c2))
* **auth-api:** add X-Organization-ID header to all API requests ([cb09d6a](https://github.com/RaphaEnterprises-AI/argus/commit/cb09d6a1bbe4737bfdbc831792d71231e8ed08d0))
* **build:** ignore ESLint warnings during production build ([2a102ed](https://github.com/RaphaEnterprises-AI/argus/commit/2a102ed55158797bd387a4a5102e15b537608e02))
* bypass service worker for additional tracking domains ([9421c70](https://github.com/RaphaEnterprises-AI/argus/commit/9421c702afee072ee84cc2b6c68462a8ebc66cc0))
* bypass service worker for tracking scripts to avoid CSP issues ([d99165c](https://github.com/RaphaEnterprises-AI/argus/commit/d99165c908df22cc75e3bf5d48f1bf0690199eeb))
* **chat:** add detailed error logging to model selector ([3ff6bfc](https://github.com/RaphaEnterprises-AI/argus/commit/3ff6bfca74926ff005c7027e739191d8ed5ed800))
* **chat:** add fallback for legacy message content format ([e9ac5c6](https://github.com/RaphaEnterprises-AI/argus/commit/e9ac5c6caaf5444af38e55aaabb51cc991baeb71))
* **chat:** add fallback platform models when API returns empty ([3f85395](https://github.com/RaphaEnterprises-AI/argus/commit/3f85395bf1f977b2ddf4b01e46dfd826187fdd6b))
* **chat:** add model selector debugging and improved empty state ([7f6ef62](https://github.com/RaphaEnterprises-AI/argus/commit/7f6ef627f97ba79a64fd1daf78614ab86f5d3511))
* **chat:** add null safety for budget values in settings panel and header ([c682ae4](https://github.com/RaphaEnterprises-AI/argus/commit/c682ae4e33cec0a7a844f46d4290e84d5b587a5e))
* **chat:** add structured logging to trace message flow ([a6de707](https://github.com/RaphaEnterprises-AI/argus/commit/a6de7074ea2a0fd94103091ebb918785192f4938))
* **chat:** AI SDK v6 compatibility and responsive layout improvements ([9b4c8ff](https://github.com/RaphaEnterprises-AI/argus/commit/9b4c8ff192ef4688b1271f212348b7468eefaf35))
* **chat:** convert header from absolute to flex layout ([db5d9f0](https://github.com/RaphaEnterprises-AI/argus/commit/db5d9f0a1d1a668a91622cff2abe262410e85249))
* **chat:** handle validation errors and multimodal content ([9b2f442](https://github.com/RaphaEnterprises-AI/argus/commit/9b2f44204262b7e66c3d477fb6a05e51575fc8d7))
* **chat:** layout height fix and stream debugging ([259eae3](https://github.com/RaphaEnterprises-AI/argus/commit/259eae336c914efa892f851a15db614c70e39f6c))
* **chat:** multiple UX fixes for AI SDK v6 migration ([d00cdbe](https://github.com/RaphaEnterprises-AI/argus/commit/d00cdbeec11fabe2f0d59d99b676524d8c44e4f4))
* **chat:** prevent message wobbling during streaming ([40f62f6](https://github.com/RaphaEnterprises-AI/argus/commit/40f62f6ad1af1f2efe8e21ae7a0966bfa20ecaff))
* **chat:** proper flexbox layout for chat container ([b4b077a](https://github.com/RaphaEnterprises-AI/argus/commit/b4b077ab70392dcb7d9e6da3f666ba0a4c9220b8))
* **chat:** resolve broken chat interface issues ([c46cd4b](https://github.com/RaphaEnterprises-AI/argus/commit/c46cd4bb69a3f75c463562c1a38dbc5bf0e1f0e5))
* **chat:** route browser operations through backend instead of Cloudflare Worker ([d9b3cea](https://github.com/RaphaEnterprises-AI/argus/commit/d9b3cea1648a0f44d2a7a646d7e4b35caa8c1602))
* **chat:** save user message BEFORE streaming to prevent race condition ([a9d2c98](https://github.com/RaphaEnterprises-AI/argus/commit/a9d2c98b95f9d4874fbc5ee96acc10ee3940590a))
* **chat:** show actual backend error messages instead of falling back ([30a8c02](https://github.com/RaphaEnterprises-AI/argus/commit/30a8c02ef5a2bd4ccf2237909dbad7fb31c25bbf))
* **chat:** show conversation list instead of auto-creating ([2b434b9](https://github.com/RaphaEnterprises-AI/argus/commit/2b434b916271a1e17611484aacf59bc53e85f319))
* **chat:** sort messages by created_at to fix ordering bug ([fc3e8c7](https://github.com/RaphaEnterprises-AI/argus/commit/fc3e8c730fc355ca1c042e354d8d52223e2bd0b7))
* **chat:** validate message content before saving to prevent 422 errors ([25b0aa5](https://github.com/RaphaEnterprises-AI/argus/commit/25b0aa5f676c745aabc7b7dd584fa77f80d74c99))
* **csp:** add clerk.heyargus.ai to Content-Security-Policy whitelist ([8093d36](https://github.com/RaphaEnterprises-AI/argus/commit/8093d36acf126b28cd26dcacdfec00385c4ea125))
* **csp:** add media-src to allow video playback from worker ([6873b35](https://github.com/RaphaEnterprises-AI/argus/commit/6873b35a6aeca239294c0ccfb71cb63b816d1ce4))
* **csp:** add worker-src, data fonts, and Vercel Live support ([caa0180](https://github.com/RaphaEnterprises-AI/argus/commit/caa0180ed738b5ddfd284d03f75166ab7366f63f))
* **dashboard:** add missing /tests/[id] route for test run details (RAP-130) ([7556f20](https://github.com/RaphaEnterprises-AI/argus/commit/7556f20de60db652223cb2b1fa8607fd39e6b284))
* **dashboard:** add suppressHydrationWarning to year displays ([70dac08](https://github.com/RaphaEnterprises-AI/argus/commit/70dac08dec01c9d2746c9ffc5ac9edc0a1641a66))
* **dashboard:** apply explicit router.push to all Link components ([4bfa238](https://github.com/RaphaEnterprises-AI/argus/commit/4bfa2388539eb06d6a78719b5c1d9b548458a948))
* **dashboard:** complete safe date handling migration for remaining pages ([3ef2a71](https://github.com/RaphaEnterprises-AI/argus/commit/3ef2a71e36f099e893f2f7be1564a993f5165f0c))
* **dashboard:** CSP violations and date handling errors ([d8fc789](https://github.com/RaphaEnterprises-AI/argus/commit/d8fc789c7838553ffa87aefac40f9a3c8379f835))
* **dashboard:** fix React hydration mismatch in DashboardHero ([b2680d8](https://github.com/RaphaEnterprises-AI/argus/commit/b2680d837172378a546197787b98f1aec0239844))
* **dashboard:** handle OAuth redirects for integration connections ([30618d2](https://github.com/RaphaEnterprises-AI/argus/commit/30618d2f57b0733ec2fbdbf6b67182088d96e5ea))
* **dashboard:** resolve React hydration mismatches ([8d6e293](https://github.com/RaphaEnterprises-AI/argus/commit/8d6e2933cd9030fd22ce592ae79dcccf6c247626))
* **dashboard:** resolve TypeScript errors from API layer migration ([16cbbc2](https://github.com/RaphaEnterprises-AI/argus/commit/16cbbc2224c9c4a2a76f0ea794283116a4d31774))
* **dashboard:** update components for API migration compatibility ([114e462](https://github.com/RaphaEnterprises-AI/argus/commit/114e462905636d054b3555621604f154692d80d9))
* **discovery:** fix cache invalidation and reduce stale times ([b31024e](https://github.com/RaphaEnterprises-AI/argus/commit/b31024e44791c744a08b7f1ecb0efce957521c93))
* **discovery:** fix legacy hook discovered_flows inserts ([eccd59a](https://github.com/RaphaEnterprises-AI/argus/commit/eccd59afe85e91b9c23e4d51a820ef2fe3e351d5))
* **discovery:** keep progress UI visible during session lifecycle ([d84d7de](https://github.com/RaphaEnterprises-AI/argus/commit/d84d7de1cba93be296b5f857a9d8d9a0cc7509f0))
* **discovery:** prevent SSE reconnection loop after completion ([bfdf86d](https://github.com/RaphaEnterprises-AI/argus/commit/bfdf86d02c95c9a9e1f1ff3e7138e7f914405883))
* **discovery:** resolve silent failure and snake_case bug ([877534b](https://github.com/RaphaEnterprises-AI/argus/commit/877534b61786f2e2ace0a2a3e45015e3f84ae0f9))
* **discovery:** show progress for newly created sessions ([ae8aa25](https://github.com/RaphaEnterprises-AI/argus/commit/ae8aa25a55625d4f99f3e742c33ccf8999ea8577))
* **discovery:** use project's toast system instead of sonner ([0cc3142](https://github.com/RaphaEnterprises-AI/argus/commit/0cc3142d7ab39408030ce3efedc27a7df04f58c8))
* fetch schedules from backend API instead of Supabase ([b1ef1f0](https://github.com/RaphaEnterprises-AI/argus/commit/b1ef1f03d20ca88087282553c3a6293eb44a592e))
* **footer:** update links to valid routes and correct social URLs ([a6fd235](https://github.com/RaphaEnterprises-AI/argus/commit/a6fd235ce634a8c9e24385cf84a37fc8eaf5dc8e))
* handle invalid URLs gracefully to prevent crashes ([3860051](https://github.com/RaphaEnterprises-AI/argus/commit/38600513440e3f9d6b448dcd9281e028de4294e0))
* **infra:** correct AI usage API path and add response transformation ([bec5d32](https://github.com/RaphaEnterprises-AI/argus/commit/bec5d32f426b1ce2a041fd8564ff504052d43b3b))
* **infra:** remove BrowserStack comparison, fix mock data fallback ([82c95e4](https://github.com/RaphaEnterprises-AI/argus/commit/82c95e47fa70da31e05839460924b70114d52756))
* **insights:** correct column name and limit session count for coverage query ([039ab74](https://github.com/RaphaEnterprises-AI/argus/commit/039ab744a9240d6c9a13aba2b27580aa17893ada))
* **integrations:** fix 422 error when connecting Sentry integration ([31edb61](https://github.com/RaphaEnterprises-AI/argus/commit/31edb611648821ea59ef075443599caba8286da0))
* **landing:** remove non-existent step.color property ([312ec60](https://github.com/RaphaEnterprises-AI/argus/commit/312ec6065f0b04fcdb6dae8792945256b3baad41))
* **lint:** replace [@ts-ignore](https://github.com/ts-ignore) with [@ts-expect-error](https://github.com/ts-expect-error) in VantaBackground ([d10da05](https://github.com/RaphaEnterprises-AI/argus/commit/d10da05bcd16e8815e3fd7fb74ac8b79de4f530a))
* **middleware:** use NextResponse to prevent immutable headers error ([f1b7a23](https://github.com/RaphaEnterprises-AI/argus/commit/f1b7a234052718a2430d0b1f2af5288a3c724441))
* move slash command logic after useChat hook declaration ([8110f81](https://github.com/RaphaEnterprises-AI/argus/commit/8110f81126304c12f31447283b0c0111f5f9e261))
* **nav:** move AI Hub link from main sidebar to Settings page ([2dfeab8](https://github.com/RaphaEnterprises-AI/argus/commit/2dfeab8a7b1a6db68072e17d07319219b8dd4c75))
* prevent horizontal overflow across all dashboard pages ([da64d92](https://github.com/RaphaEnterprises-AI/argus/commit/da64d9252e462d448504c99f47f9e4913c7e1d6b))
* prevent RangeError from invalid dates across dashboard ([6461b59](https://github.com/RaphaEnterprises-AI/argus/commit/6461b59ec78def3432f66a9cfd02736de928291b))
* **pwa:** disable service worker to fix SSE stream failures ([6acb900](https://github.com/RaphaEnterprises-AI/argus/commit/6acb900c40f1c5b1e8b321db498ecc1398c3f14d))
* **pwa:** exclude SSE streaming endpoints from service worker caching ([31b0b77](https://github.com/RaphaEnterprises-AI/argus/commit/31b0b77081675f0278aad4a00731eb1830fdc96a))
* reorganize hooks to ensure variables declared before use ([4ac6a37](https://github.com/RaphaEnterprises-AI/argus/commit/4ac6a37d178593761fce527a6252adc530a67022))
* **schedules:** add AI analysis fields to run history mapping ([c016b56](https://github.com/RaphaEnterprises-AI/argus/commit/c016b566d5090373674de1923ecbadecf0b9b81c))
* **schedules:** convert null to undefined for TypeScript compatibility ([93e0759](https://github.com/RaphaEnterprises-AI/argus/commit/93e07593a81012c47cd228ae3a3ed1404746e600))
* **sidebar:** prevent /tests and /tests/library from both being active ([37475cc](https://github.com/RaphaEnterprises-AI/argus/commit/37475cc7d0ae7c43a38603cae3bc8ba742f4d3eb))
* **sidebar:** remove duplicate icons and fix alignment in collapsed mode ([79967da](https://github.com/RaphaEnterprises-AI/argus/commit/79967da7c7622cb8c20a25b1b578cc32c4eb52bf))
* **sidebar:** use explicit router.push to avoid navigation delays ([d2fe996](https://github.com/RaphaEnterprises-AI/argus/commit/d2fe996aea667a1983ffd7bd3dacb6a24b33f9ea))
* **sw:** use NetworkOnly for API endpoints to prevent CORS caching ([6659dee](https://github.com/RaphaEnterprises-AI/argus/commit/6659dee596a3fcea40a61161db6670f830c4d2ed))
* **tests:** add authentication to LiveExecutionModal browser calls ([8bddbba](https://github.com/RaphaEnterprises-AI/argus/commit/8bddbba7cabca412fa9e80e6d9a78ba6fb10011e))
* **tests:** add Clerk and useAuthApi mocks to use-infra tests ([27732f9](https://github.com/RaphaEnterprises-AI/argus/commit/27732f99249243c200374489e4686e9feba2b8d0))
* **tests:** add suppressHydrationWarning to time-relative elements ([202ea63](https://github.com/RaphaEnterprises-AI/argus/commit/202ea63d5dff9bc02ef84dbdd9874c000bb2c870))
* **tests:** fix horizontal overflow and improve responsive layout ([813a3bd](https://github.com/RaphaEnterprises-AI/argus/commit/813a3bd7e5c148697b6e2c75290357711b1b981d))
* **tests:** handle multiple step data formats in test execution ([7f4448e](https://github.com/RaphaEnterprises-AI/argus/commit/7f4448eb5f114b5eafdf16468785aae1b58aab20))
* **tests:** resolve hydration mismatch and broken route ([132897a](https://github.com/RaphaEnterprises-AI/argus/commit/132897a7fca53736078d7482cf7a6ba7d99e9c82))
* **tests:** route browser automation to backend API instead of Cloudflare Worker ([478eb5b](https://github.com/RaphaEnterprises-AI/argus/commit/478eb5b262796ff18b866d8b244cf6efb1361de2))
* **tests:** update toast test assertions to match component styles ([1071d54](https://github.com/RaphaEnterprises-AI/argus/commit/1071d541977d70d517f823bdf301da476a5634f8))
* **tests:** use signed recording_url from backend for video playback ([51e5c89](https://github.com/RaphaEnterprises-AI/argus/commit/51e5c89c5bf45360ccfbfc7c77184ee8296b675a))
* transform broken R2 URLs to Worker proxy for screenshots ([d73462b](https://github.com/RaphaEnterprises-AI/argus/commit/d73462b3e03ee46ebb12b93c0defe757a5e421b8))
* **types:** align all interfaces and property accesses with camelCase API responses ([24ef3df](https://github.com/RaphaEnterprises-AI/argus/commit/24ef3dfe88080ed3a0aa76143a6dfe3486718e2b))
* **ui:** improve toast notification visibility and styling ([890d05d](https://github.com/RaphaEnterprises-AI/argus/commit/890d05db25e529edc5ba87c904c9d71131036d5b))
* **ui:** prevent CommandPalette from blocking sidebar clicks ([f9fa3b1](https://github.com/RaphaEnterprises-AI/argus/commit/f9fa3b17a6f0cd25a459a37c6e101f2c54393f27))
* update /chat welcome message to match branding ([1efa32f](https://github.com/RaphaEnterprises-AI/argus/commit/1efa32f5f6032811e303085a8aed5585af71afb0))
* use 'Hey Argus' instead of 'Argus Agent' for multi-agent system ([47ef480](https://github.com/RaphaEnterprises-AI/argus/commit/47ef4809c106fac9b322f4a53787e47799729fa6))
* use onChange instead of onCheckedChange for ToggleRow ([c545d2a](https://github.com/RaphaEnterprises-AI/argus/commit/c545d2aaa511982e5e577ff66d0e59258f467dd9))
* use production Railway URL fallback instead of localhost ([1716933](https://github.com/RaphaEnterprises-AI/argus/commit/17169330f88c4e4df1f8dcb11dfcd7cfa62aeafc))
* use useAuthApi hook for authenticated infra requests ([b9596ce](https://github.com/RaphaEnterprises-AI/argus/commit/b9596ce3c32a64657a0c1e1bc0182566cc1c5ecc))
* use Worker proxy for screenshots in chat interface ([b9ffab2](https://github.com/RaphaEnterprises-AI/argus/commit/b9ffab2befae3958207def5aa9edecf33ba1b684))
* **visual-ai:** add onClick handlers to Quick Actions buttons ([9f5d5b9](https://github.com/RaphaEnterprises-AI/argus/commit/9f5d5b9c21ffe5f0fa89e47d7da71928203678f4))


### Reverts

* remove backend API migration changes ([6b813fe](https://github.com/RaphaEnterprises-AI/argus/commit/6b813fe2f73509fa52a12651288d8f43349f7077))
* undo type fixes to unblock deployment ([96b2598](https://github.com/RaphaEnterprises-AI/argus/commit/96b25980eebaffbc05ececaed4d1593fa966cd5a))


### Code Refactoring

* **api:** remove manual case conversion, rely on backend middleware ([04c88ec](https://github.com/RaphaEnterprises-AI/argus/commit/04c88ecc713a0157706ab43df228e549ae7397c7))
* **chat:** use toast notifications for errors instead of inline display ([1ecf469](https://github.com/RaphaEnterprises-AI/argus/commit/1ecf4693a68f82b0f52bb8ec0fc9c616b94f881a))
* prefer const over let for non-reassigned variables ([a82aacd](https://github.com/RaphaEnterprises-AI/argus/commit/a82aacdc7ce5d28a63396e7d8b657419f0e3ae36))
* rebrand from 'Testing Platform' to 'AI Quality Intelligence' ([953bccf](https://github.com/RaphaEnterprises-AI/argus/commit/953bccff3668086f2f6934dc4472ed93ac04678e))
* **tests:** standardize barrel exports and Props interfaces ([7041f70](https://github.com/RaphaEnterprises-AI/argus/commit/7041f70bf7abe83f55b36e11a201ff5af5071d06))

## [1.6.0](https://github.com/RaphaEnterprises-AI/argus/compare/v1.5.0...v1.6.0) (2026-01-28)


### Features

* add signed URL support for authenticated screenshot access ([568e5cd](https://github.com/RaphaEnterprises-AI/argus/commit/568e5cd371ceefe2fd440f974cbcca1fde6a4957))
* BYOK AI settings UI and chat enhancements ([c84751a](https://github.com/RaphaEnterprises-AI/argus/commit/c84751aed22e4b938cf024ddc88588f86e9a5949))
* **ci:** add test workflow with coverage enforcement ([ba423f7](https://github.com/RaphaEnterprises-AI/argus/commit/ba423f739d11eb9562d70851c4ce9d87a0e8829c))
* **correlations:** add SDLC correlation dashboard UI (RAP-87) ([b086a18](https://github.com/RaphaEnterprises-AI/argus/commit/b086a18c503823f279b1f8b7a8d71346516f4f23))
* **dashboard:** add 7 new testing sections with AI-driven insights ([603cfa0](https://github.com/RaphaEnterprises-AI/argus/commit/603cfa088808940cc0f3640928243d4d5a5aa550))
* **dashboard:** add AI Hub with multi-persona settings interface ([80187bc](https://github.com/RaphaEnterprises-AI/argus/commit/80187bcbc7102d6311cfe01ac464d19ffc55c5e3))
* **dashboard:** add authenticated screenshot fetching ([5952e2c](https://github.com/RaphaEnterprises-AI/argus/commit/5952e2c670ca5c5326dea7d63539a97da57ce89a))
* **dashboard:** add backend API migration foundation with feature flags ([3e82385](https://github.com/RaphaEnterprises-AI/argus/commit/3e82385f6154e29771cf406651e12b2055abb237))
* **dashboard:** add debug logging for API migration paths ([db5dcaf](https://github.com/RaphaEnterprises-AI/argus/commit/db5dcafd30a0664bc3685ba2efddeef2578adbe5))
* **dashboard:** Add Infrastructure & Costs page ([542b5f2](https://github.com/RaphaEnterprises-AI/argus/commit/542b5f26987688b29af16add38da2bcc111587d7))
* **dashboard:** add plugin events, integrations, and fix TypeScript errors ([4bf60c7](https://github.com/RaphaEnterprises-AI/argus/commit/4bf60c77f77becc5843895b324c0609d3df41885))
* **dashboard:** display AI analysis in Schedule Run History ([7160aab](https://github.com/RaphaEnterprises-AI/argus/commit/7160aabe5c40b1ba855a6c9fb894168578284b15))
* **dashboard:** major frontend performance and UX improvements ([09e8ae9](https://github.com/RaphaEnterprises-AI/argus/commit/09e8ae944b941c4f1e837b47b01f5a44f2cbd5eb))
* **design:** universal design language with light theme default ([7c0c91d](https://github.com/RaphaEnterprises-AI/argus/commit/7c0c91d6db570ad0a9b08963d408675d97ff0356))
* **discovery:** fix SSE event handling and add cloud settings persistence ([a9e8bd7](https://github.com/RaphaEnterprises-AI/argus/commit/a9e8bd72ff021d7e80bb7fbf655eac542f03da3c))
* improve dashboard robustness and test coverage ([1632543](https://github.com/RaphaEnterprises-AI/argus/commit/163254367793e2e279595eb9519742ca31aa37f7))
* **infra:** add Monitoring tab with Grafana/Prometheus/AlertManager status ([0186dc7](https://github.com/RaphaEnterprises-AI/argus/commit/0186dc7e9b16a668917b17996452b65f5fe81708))
* **infra:** add System Health tab with data layer health monitoring ([8b686c0](https://github.com/RaphaEnterprises-AI/argus/commit/8b686c0f3f0215262bb5a7e38c3d4fce681fc543))
* **monitoring:** add direct links to Grafana, Prometheus, AlertManager ([7868601](https://github.com/RaphaEnterprises-AI/argus/commit/786860151d2d618eb89ebe8a41356b106823be74))
* **schedules:** add real-time SSE streaming and backend API integration ([b1d5a2f](https://github.com/RaphaEnterprises-AI/argus/commit/b1d5a2f78aba86f5ff8506cf801f233d06495f91))
* **sentry:** add Sentry error monitoring and performance tracking ([adbdd37](https://github.com/RaphaEnterprises-AI/argus/commit/adbdd372810c9cd1f16fb425b0d66b520a6f1327))
* **tests:** add comprehensive test suite with 2,502 passing tests ([70f775b](https://github.com/RaphaEnterprises-AI/argus/commit/70f775bc91ddab707f59a9ed30e79aea4d2b5ffd))
* **tests:** add session replay with video and screenshot slideshow ([9830c91](https://github.com/RaphaEnterprises-AI/argus/commit/9830c91c7d700928ca5b3efd0f13c16e453d4bda))
* **tests:** enhance test run detail page with comprehensive UI components ([c65a03f](https://github.com/RaphaEnterprises-AI/argus/commit/c65a03f26af5ffc45489c9231aa0f2d2f4d146d5))
* **tests:** integrate all new components into test run detail page ([5dbc0d7](https://github.com/RaphaEnterprises-AI/argus/commit/5dbc0d7477cdcf9f7720da86da58a6211e60566c))
* **ux:** add loading.tsx skeletons to all pages for instant feedback ([45f63c1](https://github.com/RaphaEnterprises-AI/argus/commit/45f63c11ef475b1815da4b1454c394097e6b9f8e))
* **visual-ai:** complete Visual AI feature with real backend integrations ([d9edd2a](https://github.com/RaphaEnterprises-AI/argus/commit/d9edd2a9d7540dab39559e79026e3d9ffbc30bcd))


### Bug Fixes

* **a11y:** add accessibility features to custom modals ([11bfbf7](https://github.com/RaphaEnterprises-AI/argus/commit/11bfbf7ad798e11fd965a1752bdd743c18ad20a4))
* **a11y:** add missing DialogDescription and SheetDescription elements ([d9bba4a](https://github.com/RaphaEnterprises-AI/argus/commit/d9bba4a776cb2628f965e7152281a3df90a3af9a))
* add centralized screenshot URL resolver for broken R2 URLs ([8e1d726](https://github.com/RaphaEnterprises-AI/argus/commit/8e1d726e54e749232074663d8c65f6160229f1fc))
* add missing lucide-react imports (FileText, Activity) ([085e2ba](https://github.com/RaphaEnterprises-AI/argus/commit/085e2ba14d8fd18c6056e85261fff8b4c3c44e27))
* **ai-hub:** fix layout issues and add missing Models page ([080123c](https://github.com/RaphaEnterprises-AI/argus/commit/080123cb9c3eb2a5819d4dc3a096acae94c41659))
* **ai-hub:** improve accessibility, error handling, and memory management ([3377164](https://github.com/RaphaEnterprises-AI/argus/commit/33771645a6eadbd2071e3fa102f8beb76ab13f28))
* **api:** add global camelCase to snake_case conversion for backend ([77ebcd6](https://github.com/RaphaEnterprises-AI/argus/commit/77ebcd632b8a5058e0f8cb9ba90cf3d35b7fce04))
* **api:** properly handle Pydantic validation errors ([1318eba](https://github.com/RaphaEnterprises-AI/argus/commit/1318eba17d09db523a996b529a863a369dab80c2))
* **auth-api:** add X-Organization-ID header to all API requests ([cb09d6a](https://github.com/RaphaEnterprises-AI/argus/commit/cb09d6a1bbe4737bfdbc831792d71231e8ed08d0))
* **build:** ignore ESLint warnings during production build ([2a102ed](https://github.com/RaphaEnterprises-AI/argus/commit/2a102ed55158797bd387a4a5102e15b537608e02))
* **chat:** add Clerk auth token to chat API requests ([d9f9c0d](https://github.com/RaphaEnterprises-AI/argus/commit/d9f9c0d114e3b582ba657994c3fc473dd827b4bb))
* **chat:** handle validation errors and multimodal content ([9b2f442](https://github.com/RaphaEnterprises-AI/argus/commit/9b2f44204262b7e66c3d477fb6a05e51575fc8d7))
* **chat:** improve error handling for auth errors in chat proxy ([f916633](https://github.com/RaphaEnterprises-AI/argus/commit/f9166335dc536db87ca90733183c079126da4c40))
* **chat:** prevent message wobbling during streaming ([40f62f6](https://github.com/RaphaEnterprises-AI/argus/commit/40f62f6ad1af1f2efe8e21ae7a0966bfa20ecaff))
* **chat:** show actual backend error messages instead of falling back ([30a8c02](https://github.com/RaphaEnterprises-AI/argus/commit/30a8c02ef5a2bd4ccf2237909dbad7fb31c25bbf))
* **csp:** add clerk.heyargus.ai to Content-Security-Policy whitelist ([8093d36](https://github.com/RaphaEnterprises-AI/argus/commit/8093d36acf126b28cd26dcacdfec00385c4ea125))
* **csp:** add media-src to allow video playback from worker ([6873b35](https://github.com/RaphaEnterprises-AI/argus/commit/6873b35a6aeca239294c0ccfb71cb63b816d1ce4))
* **csp:** add worker-src, data fonts, and Vercel Live support ([caa0180](https://github.com/RaphaEnterprises-AI/argus/commit/caa0180ed738b5ddfd284d03f75166ab7366f63f))
* **dashboard:** add missing /tests/[id] route for test run details (RAP-130) ([7556f20](https://github.com/RaphaEnterprises-AI/argus/commit/7556f20de60db652223cb2b1fa8607fd39e6b284))
* **dashboard:** apply explicit router.push to all Link components ([4bfa238](https://github.com/RaphaEnterprises-AI/argus/commit/4bfa2388539eb06d6a78719b5c1d9b548458a948))
* **dashboard:** Fix infra page layout to match template design ([3c9c54d](https://github.com/RaphaEnterprises-AI/argus/commit/3c9c54d82721c435e5b89f10c863c37622442649))
* **dashboard:** resolve auth race condition causing 401 errors ([fcb98bd](https://github.com/RaphaEnterprises-AI/argus/commit/fcb98bd87eca3f565d6ceed63ee60acebf72eb34))
* **dashboard:** suppress auth warning + security headers + type alignment ([5b2be31](https://github.com/RaphaEnterprises-AI/argus/commit/5b2be313bcf81b674b217a71a09539ad58443e67))
* **dashboard:** use backend API for projects to sync with MCP ([6e01362](https://github.com/RaphaEnterprises-AI/argus/commit/6e01362c00216b23b1f02e4f19b4cb2e325dc3c1))
* **discovery:** align type mappings with backend enum values ([41c2dd1](https://github.com/RaphaEnterprises-AI/argus/commit/41c2dd1260b5c8fee619c14ebc8ab4645322fe37))
* **discovery:** fix cache invalidation and reduce stale times ([b31024e](https://github.com/RaphaEnterprises-AI/argus/commit/b31024e44791c744a08b7f1ecb0efce957521c93))
* **discovery:** fix legacy hook discovered_flows inserts ([eccd59a](https://github.com/RaphaEnterprises-AI/argus/commit/eccd59afe85e91b9c23e4d51a820ef2fe3e351d5))
* **discovery:** keep progress UI visible during session lifecycle ([d84d7de](https://github.com/RaphaEnterprises-AI/argus/commit/d84d7de1cba93be296b5f857a9d8d9a0cc7509f0))
* **discovery:** prevent SSE reconnection loop after completion ([bfdf86d](https://github.com/RaphaEnterprises-AI/argus/commit/bfdf86d02c95c9a9e1f1ff3e7138e7f914405883))
* **discovery:** resolve silent failure and snake_case bug ([877534b](https://github.com/RaphaEnterprises-AI/argus/commit/877534b61786f2e2ace0a2a3e45015e3f84ae0f9))
* **discovery:** show progress for newly created sessions ([ae8aa25](https://github.com/RaphaEnterprises-AI/argus/commit/ae8aa25a55625d4f99f3e742c33ccf8999ea8577))
* **discovery:** use project's toast system instead of sonner ([0cc3142](https://github.com/RaphaEnterprises-AI/argus/commit/0cc3142d7ab39408030ce3efedc27a7df04f58c8))
* **e2e:** correct page.url() usage - returns string not Promise ([f3f8afa](https://github.com/RaphaEnterprises-AI/argus/commit/f3f8afab6faddccb9157498a06e0281926bf7d73))
* fetch schedules from backend API instead of Supabase ([b1ef1f0](https://github.com/RaphaEnterprises-AI/argus/commit/b1ef1f03d20ca88087282553c3a6293eb44a592e))
* **footer:** update links to valid routes and correct social URLs ([a6fd235](https://github.com/RaphaEnterprises-AI/argus/commit/a6fd235ce634a8c9e24385cf84a37fc8eaf5dc8e))
* handle invalid URLs gracefully to prevent crashes ([3860051](https://github.com/RaphaEnterprises-AI/argus/commit/38600513440e3f9d6b448dcd9281e028de4294e0))
* **infra:** correct AI usage API path and add response transformation ([bec5d32](https://github.com/RaphaEnterprises-AI/argus/commit/bec5d32f426b1ce2a041fd8564ff504052d43b3b))
* **infra:** remove BrowserStack comparison, fix mock data fallback ([82c95e4](https://github.com/RaphaEnterprises-AI/argus/commit/82c95e47fa70da31e05839460924b70114d52756))
* **landing:** remove non-existent step.color property ([312ec60](https://github.com/RaphaEnterprises-AI/argus/commit/312ec6065f0b04fcdb6dae8792945256b3baad41))
* **lint:** add ESLint configuration for CI ([9e4fd9e](https://github.com/RaphaEnterprises-AI/argus/commit/9e4fd9e1db3f543c0ab7361dbe254f62e0e83e69))
* **lint:** replace [@ts-ignore](https://github.com/ts-ignore) with [@ts-expect-error](https://github.com/ts-expect-error) in VantaBackground ([d10da05](https://github.com/RaphaEnterprises-AI/argus/commit/d10da05bcd16e8815e3fd7fb74ac8b79de4f530a))
* **lint:** resolve all ESLint errors for CI ([69eb264](https://github.com/RaphaEnterprises-AI/argus/commit/69eb2644da7aeec4aec03244b2f4729fee1d07cf))
* move slash command logic after useChat hook declaration ([8110f81](https://github.com/RaphaEnterprises-AI/argus/commit/8110f81126304c12f31447283b0c0111f5f9e261))
* prevent horizontal overflow across all dashboard pages ([da64d92](https://github.com/RaphaEnterprises-AI/argus/commit/da64d9252e462d448504c99f47f9e4913c7e1d6b))
* reorganize hooks to ensure variables declared before use ([4ac6a37](https://github.com/RaphaEnterprises-AI/argus/commit/4ac6a37d178593761fce527a6252adc530a67022))
* **schedules:** add AI analysis fields to run history mapping ([c016b56](https://github.com/RaphaEnterprises-AI/argus/commit/c016b566d5090373674de1923ecbadecf0b9b81c))
* **schedules:** convert null to undefined for TypeScript compatibility ([93e0759](https://github.com/RaphaEnterprises-AI/argus/commit/93e07593a81012c47cd228ae3a3ed1404746e600))
* **screenshots:** resolve R2 references via backend API ([51c7c02](https://github.com/RaphaEnterprises-AI/argus/commit/51c7c02cae7b5a3f91202c41208cc2dd242e4645))
* **sidebar:** prevent /tests and /tests/library from both being active ([37475cc](https://github.com/RaphaEnterprises-AI/argus/commit/37475cc7d0ae7c43a38603cae3bc8ba742f4d3eb))
* **sidebar:** use explicit router.push to avoid navigation delays ([d2fe996](https://github.com/RaphaEnterprises-AI/argus/commit/d2fe996aea667a1983ffd7bd3dacb6a24b33f9ea))
* **tests:** add authentication to LiveExecutionModal browser calls ([8bddbba](https://github.com/RaphaEnterprises-AI/argus/commit/8bddbba7cabca412fa9e80e6d9a78ba6fb10011e))
* **tests:** add suppressHydrationWarning to time-relative elements ([202ea63](https://github.com/RaphaEnterprises-AI/argus/commit/202ea63d5dff9bc02ef84dbdd9874c000bb2c870))
* **tests:** additional hook test assertions for disabled queries ([c2ffa97](https://github.com/RaphaEnterprises-AI/argus/commit/c2ffa97a70c97a8f10fdb55288d0c9a128f11f06))
* **tests:** correct hook test assertions for disabled queries ([e858a70](https://github.com/RaphaEnterprises-AI/argus/commit/e858a70f0f17621b5210fca448fc85800fac6c70))
* **tests:** fix additional hook test failures ([0493791](https://github.com/RaphaEnterprises-AI/argus/commit/049379174cf5f4070549cf7a6edde2998f39b90e))
* **tests:** fix horizontal overflow and improve responsive layout ([813a3bd](https://github.com/RaphaEnterprises-AI/argus/commit/813a3bd7e5c148697b6e2c75290357711b1b981d))
* **tests:** fix mcp-sessions loading state test ([d3bdc7c](https://github.com/RaphaEnterprises-AI/argus/commit/d3bdc7c79bc51ab51b453710b3d2420159b09c59))
* **tests:** fix use-presence.test.ts mock setup and assertions ([d52f3d8](https://github.com/RaphaEnterprises-AI/argus/commit/d52f3d8b7c21e4bcca9d9ce61acada90c8018631))
* **tests:** handle multiple step data formats in test execution ([7f4448e](https://github.com/RaphaEnterprises-AI/argus/commit/7f4448eb5f114b5eafdf16468785aae1b58aab20))
* **tests:** improve vitest setup and hook test mocking ([e3c8dc5](https://github.com/RaphaEnterprises-AI/argus/commit/e3c8dc5007f0ae2f76c3e50fd277780ef44ee2f2))
* **tests:** resolve hydration mismatch and broken route ([132897a](https://github.com/RaphaEnterprises-AI/argus/commit/132897a7fca53736078d7482cf7a6ba7d99e9c82))
* **tests:** route browser automation to backend API instead of Cloudflare Worker ([478eb5b](https://github.com/RaphaEnterprises-AI/argus/commit/478eb5b262796ff18b866d8b244cf6efb1361de2))
* **tests:** update toast test assertions to match component styles ([1071d54](https://github.com/RaphaEnterprises-AI/argus/commit/1071d541977d70d517f823bdf301da476a5634f8))
* **tests:** use signed recording_url from backend for video playback ([51e5c89](https://github.com/RaphaEnterprises-AI/argus/commit/51e5c89c5bf45360ccfbfc7c77184ee8296b675a))
* transform broken R2 URLs to Worker proxy for screenshots ([d73462b](https://github.com/RaphaEnterprises-AI/argus/commit/d73462b3e03ee46ebb12b93c0defe757a5e421b8))
* **ui:** improve toast notification visibility and styling ([890d05d](https://github.com/RaphaEnterprises-AI/argus/commit/890d05db25e529edc5ba87c904c9d71131036d5b))
* **ui:** prevent CommandPalette from blocking sidebar clicks ([f9fa3b1](https://github.com/RaphaEnterprises-AI/argus/commit/f9fa3b17a6f0cd25a459a37c6e101f2c54393f27))
* update /chat welcome message to match branding ([1efa32f](https://github.com/RaphaEnterprises-AI/argus/commit/1efa32f5f6032811e303085a8aed5585af71afb0))
* update worker URL to argus-api across all components ([a45c88f](https://github.com/RaphaEnterprises-AI/argus/commit/a45c88fb8641eb54a020a4d36c980f59dd82cef4))
* use 'Hey Argus' instead of 'Argus Agent' for multi-agent system ([47ef480](https://github.com/RaphaEnterprises-AI/argus/commit/47ef4809c106fac9b322f4a53787e47799729fa6))
* use onChange instead of onCheckedChange for ToggleRow ([c545d2a](https://github.com/RaphaEnterprises-AI/argus/commit/c545d2aaa511982e5e577ff66d0e59258f467dd9))
* use production Railway URL fallback instead of localhost ([1716933](https://github.com/RaphaEnterprises-AI/argus/commit/17169330f88c4e4df1f8dcb11dfcd7cfa62aeafc))
* use useAuthApi hook for authenticated infra requests ([b9596ce](https://github.com/RaphaEnterprises-AI/argus/commit/b9596ce3c32a64657a0c1e1bc0182566cc1c5ecc))
* use Worker proxy for screenshots in chat interface ([b9ffab2](https://github.com/RaphaEnterprises-AI/argus/commit/b9ffab2befae3958207def5aa9edecf33ba1b684))
* **visual-ai:** add onClick handlers to Quick Actions buttons ([9f5d5b9](https://github.com/RaphaEnterprises-AI/argus/commit/9f5d5b9c21ffe5f0fa89e47d7da71928203678f4))


### Reverts

* remove backend API migration changes ([6b813fe](https://github.com/RaphaEnterprises-AI/argus/commit/6b813fe2f73509fa52a12651288d8f43349f7077))


### Documentation

* update Clerk env vars to use new redirect props ([9967329](https://github.com/RaphaEnterprises-AI/argus/commit/99673291c56aa515b798e34c945f97eb91dc11ab))


### Code Refactoring

* rebrand from 'Testing Platform' to 'AI Quality Intelligence' ([953bccf](https://github.com/RaphaEnterprises-AI/argus/commit/953bccff3668086f2f6934dc4472ed93ac04678e))
* **tests:** standardize barrel exports and Props interfaces ([7041f70](https://github.com/RaphaEnterprises-AI/argus/commit/7041f70bf7abe83f55b36e11a201ff5af5071d06))

## [1.5.0](https://github.com/RaphaEnterprises-AI/argus/compare/v1.4.0...v1.5.0) (2026-01-16)


### Features

* add Clerk JWT authentication integration ([0faef8c](https://github.com/RaphaEnterprises-AI/argus/commit/0faef8c95da599451c9f47c4522ea5102409ed70))
* add enterprise dashboard pages with real API integration ([a381a2c](https://github.com/RaphaEnterprises-AI/argus/commit/a381a2c54f20dee52d087e7567781bb4224220a5))
* add error display in chat interface ([954590e](https://github.com/RaphaEnterprises-AI/argus/commit/954590ebc4267700af0a586a60a0adeb31616425))
* add mobile theme toggle and bump version to v1.1.0 ([7496dc5](https://github.com/RaphaEnterprises-AI/argus/commit/7496dc58cddf2d0f8c4abf8c49ff6589d6dfa0db))
* add organization and user management UI ([a53d62f](https://github.com/RaphaEnterprises-AI/argus/commit/a53d62f76473faf605addf44fdd6a35d77a02ccb))
* add project management and live session system ([4fc09a2](https://github.com/RaphaEnterprises-AI/argus/commit/4fc09a2ed6a23fb1e697c79006731e431cc76a49))
* add React hooks for settings page and rewrite settings UI ([03e9f35](https://github.com/RaphaEnterprises-AI/argus/commit/03e9f351fb66461dbf8b0e5534a5f04c753b359c))
* add real-time activity tracking and mobile responsive sidebar ([56d046e](https://github.com/RaphaEnterprises-AI/argus/commit/56d046ef76df08d16ebe1391c72c5d4a9ef43e84))
* add theme switching and fix sidebar scroll-to-active ([35f15fe](https://github.com/RaphaEnterprises-AI/argus/commit/35f15fe2e7ed7219d940f8f4c4f3c61ef390ebd7))
* Argus Dashboard - AI-Powered E2E Testing Platform ([e49607e](https://github.com/RaphaEnterprises-AI/argus/commit/e49607e0a7f5a2c8fddb1dd6a23e705342b5f53a))
* **dashboard:** add device auth page and UI improvements ([5affd96](https://github.com/RaphaEnterprises-AI/argus/commit/5affd965b84999c256037ea0834d1563a91762e1))
* **dashboard:** add embedded API documentation page ([5420e43](https://github.com/RaphaEnterprises-AI/argus/commit/5420e4326c07804df89fa5af9c35aa2e009b9e61))
* **dashboard:** add MCP Sessions management page ([aa7af2b](https://github.com/RaphaEnterprises-AI/argus/commit/aa7af2b0f30becaf8a16d2cf43f6a2c8fe9a27b5))
* **dashboard:** unified organization context architecture ([d0436cd](https://github.com/RaphaEnterprises-AI/argus/commit/d0436cdd9651258ad2492622b5b8e085d2eee708))
* Display AI healing suggestions for failed tests ([d86a230](https://github.com/RaphaEnterprises-AI/argus/commit/d86a2301636eda24e395d0b6dd80b1403a8f03e5))
* enhance landing page with modern SaaS design ([74505b7](https://github.com/RaphaEnterprises-AI/argus/commit/74505b7203b5ee45d2f4abe1c382649556cd0206))
* fix timeouts and add screenshot gallery for test results ([d125863](https://github.com/RaphaEnterprises-AI/argus/commit/d125863358d55b7f3338e17dd9bdd50d381b33ac))
* implement mobile-first redesign for chat page ([f6b4f69](https://github.com/RaphaEnterprises-AI/argus/commit/f6b4f693f5696c1b2bc4ab35ed567a4fe1fc82dc))
* integrate chat API with Argus Brain backend ([08d8922](https://github.com/RaphaEnterprises-AI/argus/commit/08d8922474a2c88ac495d5656d97bbaa4676d135))
* integrate real-time data hooks into dashboard pages ([c6485f3](https://github.com/RaphaEnterprises-AI/argus/commit/c6485f3d243de269ec5f36ba47921984b50df360))
* Major dashboard upgrade - competitor-level UI with real-time features ([c1f0949](https://github.com/RaphaEnterprises-AI/argus/commit/c1f09495e58f1f97c32cd459d2510a24ac5c4bc8))
* Real-time feedback system with connection health monitoring ([af0a065](https://github.com/RaphaEnterprises-AI/argus/commit/af0a065a0b91fda0a78f287545b4bf5e8722cd18))
* switch to Devicon CDN for comprehensive icon support ([601a5d4](https://github.com/RaphaEnterprises-AI/argus/commit/601a5d48f8f35ef2a91eafe121b0867d73ee0a45))
* **ui:** redesign sidebar with cleaner organization ([fbf25c9](https://github.com/RaphaEnterprises-AI/argus/commit/fbf25c9b0694723050844cd7885155aff0496397))


### Bug Fixes

* add API rewrites to proxy /api/v1/* to Railway backend ([740a151](https://github.com/RaphaEnterprises-AI/argus/commit/740a151e663758732da8c3e76bacb8dcb28d4e21))
* add authentication to API keys page ([970e0a5](https://github.com/RaphaEnterprises-AI/argus/commit/970e0a52f09cd8e5d255a765f48403f991743f31))
* add custom sign-in/sign-up pages to fix CORS errors ([f18ac17](https://github.com/RaphaEnterprises-AI/argus/commit/f18ac17629de2c84e350fd82f7dbe785383f7b54))
* add explicit sign-out button to resolve session clearing issue ([d5f17c2](https://github.com/RaphaEnterprises-AI/argus/commit/d5f17c273c5b33d6ac4bba1769435f9c754f041f))
* add JWT auth token to org-switcher API calls ([ebae98b](https://github.com/RaphaEnterprises-AI/argus/commit/ebae98b4d284931395f0e6fbee7901c29c0db4f1))
* allow /api/v1/* routes to bypass Clerk middleware ([ff744fa](https://github.com/RaphaEnterprises-AI/argus/commit/ff744fa2041a0316a40ff8521f1740b7d42e3259))
* **auth:** implement global API client with Clerk authentication ([81dbe8a](https://github.com/RaphaEnterprises-AI/argus/commit/81dbe8a5184f93df288fee635271d1feb7ac0933))
* **chat:** add error handling and API key validation ([2a27157](https://github.com/RaphaEnterprises-AI/argus/commit/2a27157511b305ade23343be03bbb81a9f237da2))
* **ci:** correct release-please config structure ([10d4f7b](https://github.com/RaphaEnterprises-AI/argus/commit/10d4f7b6b981f9aeafbea122f1c5fd2468839ab0))
* **ci:** use config files for release-please instead of inline params ([c5e5268](https://github.com/RaphaEnterprises-AI/argus/commit/c5e52684f93b3e503b148f99d9c57ee52647ad0a))
* **ci:** use PAT for release-please to trigger other workflows ([548790d](https://github.com/RaphaEnterprises-AI/argus/commit/548790d87b49912d185ca306f073cb8253cf85a2))
* critical chat message persistence and session handling bugs ([13f9b22](https://github.com/RaphaEnterprises-AI/argus/commit/13f9b2223abc2ebcfd61b9373be26ab86d266821))
* critical persistence and timeout issues ([390b708](https://github.com/RaphaEnterprises-AI/argus/commit/390b708c305e13eceb95dd64b849916ab1df3b1c))
* **dashboard:** update API docs page to use universal template ([ddc1141](https://github.com/RaphaEnterprises-AI/argus/commit/ddc1141470c5bf738479046e7a14389ecb0794c6))
* exclude /api/v1/* from Clerk middleware matcher entirely ([45478ad](https://github.com/RaphaEnterprises-AI/argus/commit/45478ad9521f51fa17bd45d063dd09212572ffbb))
* exclude vitest config files from Next.js build ([7f2fad6](https://github.com/RaphaEnterprises-AI/argus/commit/7f2fad6a541546c67dda7b70b86037c6407b64b2))
* handle RSC prefetch requests to avoid CORS errors after sign-out ([91220f8](https://github.com/RaphaEnterprises-AI/argus/commit/91220f828b55d7e5cf94a959f58d511291325e64))
* hide command palette on landing page for signed-out users ([e6a251c](https://github.com/RaphaEnterprises-AI/argus/commit/e6a251ce8f9620191af506a79d257c89ca29f2e9))
* improve Clerk login form button visibility in dark theme ([d46bc74](https://github.com/RaphaEnterprises-AI/argus/commit/d46bc74e980e62c8b1e022289b186b2c11363d3a))
* improve Clerk user menu and profile page visibility ([e0da0f6](https://github.com/RaphaEnterprises-AI/argus/commit/e0da0f65e90860672cd6c04eaadc01f52fe585c5))
* make chat API public (auth handled by backend) ([0549c2a](https://github.com/RaphaEnterprises-AI/argus/commit/0549c2aaaed8220d7bbd1e79fef68fc4ccb271af))
* move search button into sidebar for proper positioning ([11365a6](https://github.com/RaphaEnterprises-AI/argus/commit/11365a68dd78219b91c298f0a0d0955c005cdae2))
* move viewport and themeColor to viewport export ([050b575](https://github.com/RaphaEnterprises-AI/argus/commit/050b575cf32697d97a2ed0aef0e4c66f454cf09a))
* position command palette trigger at top-right for signed-in users ([7257cc3](https://github.com/RaphaEnterprises-AI/argus/commit/7257cc38bbe0153b51d9a6d9373112b4c33ece05))
* prevent AI from calling discoverElements multiple times ([b8b7b22](https://github.com/RaphaEnterprises-AI/argus/commit/b8b7b2237ec8868d23b095b787f1a6073d98b2b8))
* prevent chat pane overflow during message streaming ([d2922f3](https://github.com/RaphaEnterprises-AI/argus/commit/d2922f35d198788fa1e2ba714e8287362abf6a3c))
* re-enable Python backend routing (SSE format fixed) ([72954e4](https://github.com/RaphaEnterprises-AI/argus/commit/72954e4aec21f65883169c04a91e473b722d68fd))
* remove argus-backend template from organization hook ([0bb15ef](https://github.com/RaphaEnterprises-AI/argus/commit/0bb15ef8d6f73e008a274e09acfba10ea1d49f9b))
* remove non-existent Clerk JWT template to fix auth errors ([c3860c8](https://github.com/RaphaEnterprises-AI/argus/commit/c3860c85888422edbff378bbfee58ea669bd3a4e))
* render markdown during streaming to prevent flash ([4be5a8d](https://github.com/RaphaEnterprises-AI/argus/commit/4be5a8d051ce4f50aaa47e14ec99f8d9307f15a3))
* replace AWS/Azure with Docker/Kubernetes icons ([9f2473a](https://github.com/RaphaEnterprises-AI/argus/commit/9f2473ac688d501d0abc2a91b03117ae7ec46b6d))
* resolve console warnings and critical chat persistence bug ([c6e16b6](https://github.com/RaphaEnterprises-AI/argus/commit/c6e16b6d5cc13d19f85155547c4f0acbf758ba5f))
* resolve CORS and accessibility issues ([17ca142](https://github.com/RaphaEnterprises-AI/argus/commit/17ca1420ed9e983c00b064f0e4649a48669201a0))
* resolve landing page console errors ([8d23b20](https://github.com/RaphaEnterprises-AI/argus/commit/8d23b2095dd0c020e72a9a10d1f01150b2cb78e3))
* return 401 for API routes instead of redirecting to sign-in ([2eaf932](https://github.com/RaphaEnterprises-AI/argus/commit/2eaf9323cb9d0b44435468693e9a204b4f15b6aa))
* standardize header height and styling across all pages ([0cd1cb8](https://github.com/RaphaEnterprises-AI/argus/commit/0cd1cb85c907d406a6171a1305c4ed55b6576958))
* standardize package description casing ([fd8310e](https://github.com/RaphaEnterprises-AI/argus/commit/fd8310e82091a471de167502fa4e91bdc9cbdab6))
* temporarily disable Python backend routing due to SSE format mismatch ([7217be5](https://github.com/RaphaEnterprises-AI/argus/commit/7217be5fd789b76e3ce97032cb180ab95a1dd131))
* **types:** resolve TypeScript errors in audit and team pages ([161994b](https://github.com/RaphaEnterprises-AI/argus/commit/161994bf89b03805c3f44608e84a2e3ee27daab4))
* **ui:** add missing dropdown-menu component ([1c98028](https://github.com/RaphaEnterprises-AI/argus/commit/1c98028697419c1901608716f333ec7f45b202b7))
* **ui:** standardize MCP sessions pages to dashboard template ([25e6c92](https://github.com/RaphaEnterprises-AI/argus/commit/25e6c92f8305a6ced4a1a35a7e8cb18628a71b4e))
* update Clerk public route patterns for /api/v1/* ([80049b8](https://github.com/RaphaEnterprises-AI/argus/commit/80049b8b8879c2c2bad89ec6f482b433e42d7578))
* update GitHub URL to organization repo ([46d0381](https://github.com/RaphaEnterprises-AI/argus/commit/46d0381cd3b3c79754fa09423691efbf00bc44c8))
* use brand colors for icons that don't support custom colors ([1e62289](https://github.com/RaphaEnterprises-AI/argus/commit/1e62289db2cdf07c9d695fa3aa078a5cdaccee5c))
* use Clerk argus-backend template in fetchJson and fetchStream ([cc2ef38](https://github.com/RaphaEnterprises-AI/argus/commit/cc2ef38a0d6bac496f8ac0403a882b583745bd25))
* use correct Content-Type for AI SDK data stream protocol ([6336598](https://github.com/RaphaEnterprises-AI/argus/commit/6336598c45fe332f4f7a1ef22c77767a8036b318))
* use correct Railway backend URL in chat route fallback ([a778c20](https://github.com/RaphaEnterprises-AI/argus/commit/a778c205828fb139272f10b9ff77217f1457ed78))
* use direct backend URL to bypass Vercel rewrites stripping auth headers ([b746062](https://github.com/RaphaEnterprises-AI/argus/commit/b746062cc151bc7f7c2bfbc7b6c60dc9a0e09c29))
* use path-to-regexp syntax for /api/v1 public route ([e895dd3](https://github.com/RaphaEnterprises-AI/argus/commit/e895dd317c4ef025fe403b5ddda4937c5d7324c1))


### Performance Improvements

* improve dashboard UX and bundle size ([932d6ba](https://github.com/RaphaEnterprises-AI/argus/commit/932d6ba7fd3a36cc7d5ff104bfc3abe04885d87a))


### Code Refactoring

* URL-based routing for chat conversations ([c8d5d75](https://github.com/RaphaEnterprises-AI/argus/commit/c8d5d75e688ec5cb3a72a845746d856e52daa9d1))

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
