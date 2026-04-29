/**
 * Playwright configuration for Press This E2E tests.
 *
 * The wp-env dev environment can land on any port when started with
 * `--auto-port` (and 8888 is busy). Resolve the live port from
 * `wp-env status --json` so tests follow wp-env wherever it lands. Order:
 * 1. PRESS_THIS_BASE_URL env var (explicit override).
 * 2. `wp-env status --json` ports.development (auto-detect).
 * 3. http://localhost:8888 (fallback for fresh checkouts before env starts).
 *
 * Reads `ports.development` rather than `urls.development` because the
 * latter comes from WP_SITEURL config and can be stale when --auto-port
 * reassigns ports.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
const { defineConfig } = require( '@playwright/test' );
const { spawnSync } = require( 'child_process' );

function resolveBaseUrl() {
	if ( process.env.PRESS_THIS_BASE_URL ) {
		return process.env.PRESS_THIS_BASE_URL;
	}

	try {
		const result = spawnSync(
			'npx',
			[ 'wp-env', 'status', '--json' ],
			{ encoding: 'utf8', timeout: 10000 }
		);
		if ( result.status === 0 && result.stdout ) {
			const status = JSON.parse( result.stdout );
			const port = status?.ports?.development;
			if ( status?.status === 'running' && port ) {
				return `http://localhost:${ port }`;
			}
		}
	} catch {
		// Fall through to default below.
	}

	return 'http://localhost:8888';
}

module.exports = defineConfig( {
	testDir: './tests/e2e',
	fullyParallel: false,
	forbidOnly: !! process.env.CI,
	retries: 1,
	workers: 1,
	reporter: 'list',
	use: {
		baseURL: resolveBaseUrl(),
		screenshot: 'only-on-failure',
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: {
				browserName: 'chromium',
			},
		},
	],
} );
