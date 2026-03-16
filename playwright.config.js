/**
 * Playwright configuration for Press This E2E tests.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
const { defineConfig } = require( '@playwright/test' );

module.exports = defineConfig( {
	testDir: './tests/e2e',
	fullyParallel: false,
	forbidOnly: !! process.env.CI,
	retries: 1,
	workers: 1,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:8888',
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
