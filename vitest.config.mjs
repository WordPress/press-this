/**
 * External dependencies
 */
import { transformWithOxc } from 'vite';
import { defineConfig } from 'vitest/config';

/*
 * Press This keeps JSX in `.js` files, which webpack and Babel accept but
 * Vite only parses in `.jsx`. Compile project `.js` files as JSX before Vite's
 * own transform sees them.
 */
const jsxInJs = {
	name: 'press-this:jsx-in-js',
	enforce: 'pre',
	async transform( code, id ) {
		if (
			! /\/(src|tests)\/.*\.js$/.test( id ) ||
			id.includes( '/node_modules/' )
		) {
			return null;
		}

		return transformWithOxc( code, id, {
			lang: 'jsx',
			jsx: { runtime: 'automatic' },
		} );
	},
};

export default defineConfig( {
	plugins: [ jsxInJs ],
	test: {
		environment: 'jsdom',
		globals: true,
		include: [ 'tests/**/*.test.js' ],
		exclude: [ '**/node_modules/**', '**/worktrees/**', 'tests/e2e/**' ],
		setupFiles: [ './tests/setup.js' ],
		server: {
			deps: {
				/*
				 * Run WordPress packages through Vite, so vi.mock() reaches
				 * imports between them (as jest.mock() did) and their JSON
				 * imports load.
				 */
				inline: [ /@wordpress\// ],
			},
		},
	},
} );
