/**
 * Standalone utility tests
 *
 * Tests for isStandaloneMode shared utility.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'Standalone mode utility', () => {
	let utilContent;

	beforeAll( () => {
		const utilPath = path.resolve(
			__dirname,
			'../../src/utils/standalone.js'
		);
		utilContent = fs.readFileSync( utilPath, 'utf8' );
	} );

	test( 'isStandaloneMode guards matchMedia availability', () => {
		expect( utilContent ).toContain(
			"typeof window.matchMedia === 'function'"
		);
	} );

	test( 'isStandaloneMode checks iOS navigator.standalone fallback', () => {
		expect( utilContent ).toContain( 'window.navigator.standalone' );
	} );

	test( 'isStandaloneMode checks display-mode: standalone media query', () => {
		expect( utilContent ).toContain( 'display-mode: standalone' );
	} );
} );

describe( 'Standalone mode usage in components', () => {
	test( 'Header.js imports isStandaloneMode from shared utils', () => {
		const headerPath = path.resolve(
			__dirname,
			'../../src/components/Header.js'
		);
		const headerContent = fs.readFileSync( headerPath, 'utf8' );
		expect( headerContent ).toContain( 'isStandaloneMode' );
		expect( headerContent ).toContain( "from '../utils'" );
	} );

	test( 'PressThisEditor.js imports isStandaloneMode from shared utils', () => {
		const editorPath = path.resolve(
			__dirname,
			'../../src/components/PressThisEditor.js'
		);
		const editorContent = fs.readFileSync( editorPath, 'utf8' );
		expect( editorContent ).toContain( 'isStandaloneMode' );
		expect( editorContent ).toContain( "from '../utils'" );
	} );
} );
