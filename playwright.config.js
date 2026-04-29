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

const DEFAULT_BASE_URL = 'http://localhost:8888';

function warnFallback( reason ) {
	// Surface why we fell back so a contributor whose env is on a non-default
	// port doesn't silently run tests against the wrong service.
	// eslint-disable-next-line no-console
	console.warn(
		`[playwright] could not resolve wp-env port (${ reason }); ` +
			`falling back to ${ DEFAULT_BASE_URL }. ` +
			'Set PRESS_THIS_BASE_URL to override.'
	);
}

function resolveBaseUrl() {
	if ( process.env.PRESS_THIS_BASE_URL ) {
		return process.env.PRESS_THIS_BASE_URL;
	}

	let result;
	try {
		result = spawnSync( 'npx', [ 'wp-env', 'status', '--json' ], {
			encoding: 'utf8',
			timeout: 10000,
		} );
	} catch ( error ) {
		warnFallback( `wp-env spawn threw: ${ error.message }` );
		return DEFAULT_BASE_URL;
	}

	if ( result.error ) {
		// Includes ETIMEDOUT from the spawn timeout above.
		warnFallback( `wp-env error: ${ result.error.message }` );
		return DEFAULT_BASE_URL;
	}

	if ( result.status !== 0 || ! result.stdout ) {
		warnFallback( `wp-env status exited ${ result.status }` );
		return DEFAULT_BASE_URL;
	}

	let status;
	try {
		status = JSON.parse( result.stdout );
	} catch ( error ) {
		warnFallback( `wp-env JSON parse failed: ${ error.message }` );
		return DEFAULT_BASE_URL;
	}

	const port = status?.ports?.development;
	if ( status?.status !== 'running' || ! port ) {
		warnFallback(
			`wp-env reported status="${ status?.status }" port=${ port }`
		);
		return DEFAULT_BASE_URL;
	}

	return `http://localhost:${ port }`;
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
