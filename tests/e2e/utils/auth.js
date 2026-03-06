/**
 * Authentication utilities for Press This E2E tests.
 *
 * Provides helpers for WordPress login and authenticated test fixtures.
 */
const { test: base, expect } = require( '@playwright/test' );
const fs = require( 'fs' );
const path = require( 'path' );

const AUTH_DIR = path.join( __dirname, '..', '..', '..', '.auth' );
const ADMIN_AUTH_FILE = path.join( AUTH_DIR, 'admin.json' );

/**
 * Log in to WordPress via wp-login.php.
 *
 * @param {import('@playwright/test').Page} page     Playwright page.
 * @param {string}                          username WordPress username.
 * @param {string}                          password WordPress password.
 */
async function wpLogin( page, username = 'admin', password = 'password' ) {
	await page.goto( '/wp-login.php' );
	await page.locator( '#user_login' ).fill( username );
	await page.locator( '#user_pass' ).fill( password );
	await page.getByRole( 'button', { name: 'Log In' } ).click();
	await page.waitForURL( /wp-admin/ );
}

/**
 * Ensure admin auth state is stored for reuse.
 *
 * @param {import('@playwright/test').Browser} browser Playwright browser.
 */
async function ensureAdminAuth( browser ) {
	if ( fs.existsSync( ADMIN_AUTH_FILE ) ) {
		return;
	}

	fs.mkdirSync( AUTH_DIR, { recursive: true } );

	const context = await browser.newContext();
	const page = await context.newPage();

	await wpLogin( page );
	await context.storageState( { path: ADMIN_AUTH_FILE } );
	await context.close();
}

/**
 * Create a WordPress user via WP-CLI through wp-env.
 *
 * This is a no-op if the user already exists; the calling test should
 * handle login failures gracefully.
 *
 * @param {string} username WordPress username.
 * @param {string} email    User email.
 * @param {string} role     WordPress role.
 * @param {string} password User password.
 */
async function createUser( username, email, role, password = 'password' ) {
	const { execSync } = require( 'child_process' );
	try {
		// Check if user already exists before attempting to create.
		execSync(
			`npx wp-env run cli wp user get ${ username } --field=ID`,
			{ stdio: 'pipe' }
		);
		// User exists — nothing to do.
	} catch {
		// User doesn't exist — create it.
		try {
			execSync(
				`npx wp-env run cli wp user create ${ username } ${ email } --role=${ role } --user_pass=${ password }`,
				{ stdio: 'pipe' }
			);
		} catch ( error ) {
			const output = ( error.stderr?.toString() || '' ) + ( error.stdout?.toString() || '' );
			if ( ! output.includes( 'already exists' ) ) {
				console.warn( `Could not create user ${ username }:`, error.message );
			}
		}
	}
}

/**
 * Extended test fixture that provides an authenticated admin session.
 *
 * Usage:
 *   const { test, expect } = require( './utils/auth' );
 *   test( 'my test', async ({ loggedInPage }) => { ... } );
 */
const test = base.extend( {
	loggedInPage: async ( { browser }, use ) => {
		await ensureAdminAuth( browser );
		const context = await browser.newContext( {
			storageState: ADMIN_AUTH_FILE,
		} );
		const page = await context.newPage();
		await use( page );
		await context.close();
	},
} );

module.exports = {
	test,
	expect,
	wpLogin,
	ensureAdminAuth,
	createUser,
	ADMIN_AUTH_FILE,
	AUTH_DIR,
};
