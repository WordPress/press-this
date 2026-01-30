/**
 * Header Publish Controls Tests
 *
 * Tests for the publish controls relocated to the header.
 * Verifies Save Draft, Publish buttons, dropdown menu, and callback handling.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'Header Publish Controls', () => {
	let headerContent;

	beforeAll( () => {
		const headerPath = path.resolve( __dirname, '../../src/components/Header.js' );
		headerContent = fs.readFileSync( headerPath, 'utf8' );
	} );

	test( 'Header accepts publish-related props', () => {
		// Check for onSave prop.
		expect( headerContent ).toContain( 'onSave' );

		// Check for isSaving prop.
		expect( headerContent ).toContain( 'isSaving' );

		// Check for publishLabel prop.
		expect( headerContent ).toContain( 'publishLabel' );
	} );

	test( 'Header renders Publish button with primary styling', () => {
		// Check for Button component import.
		expect( headerContent ).toContain( 'Button' );

		// Check for primary variant button for publish.
		expect( headerContent ).toContain( 'variant="primary"' );

		// Check that publishLabel is used.
		expect( headerContent ).toContain( 'publishLabel' );
	} );

	test( 'Header renders Save Draft button as secondary/tertiary style', () => {
		// Check for Save Draft text or call.
		expect( headerContent ).toContain( 'Save Draft' );

		// Check for tertiary or link variant (secondary text style).
		expect(
			headerContent.includes( 'variant="tertiary"' ) || headerContent.includes( 'variant="link"' )
		).toBe( true );
	} );

	test( 'Header has dropdown menu with Continue in Standard Editor', () => {
		// Check for DropdownMenu import or usage.
		expect( headerContent ).toContain( 'DropdownMenu' );

		// Check for Continue in Standard Editor option.
		expect( headerContent ).toContain( 'Continue in Standard Editor' );
	} );

	test( 'Header calls onSave with correct status parameters', () => {
		// Check for onSave('draft') call.
		expect( headerContent ).toContain( "onSave( 'draft'" );

		// Check for onSave('publish') call.
		expect( headerContent ).toContain( "onSave( 'publish'" );

		// Check for forceRedirect option for Continue in Standard Editor.
		expect( headerContent ).toContain( 'forceRedirect' );
	} );

	test( 'Header has actions section with correct class', () => {
		// Check for actions container class.
		expect( headerContent ).toContain( 'press-this-header__actions' );

		// Check for isBusy prop to show loading state.
		expect( headerContent ).toContain( 'isBusy' );

		// Check for disabled state.
		expect( headerContent ).toContain( 'disabled' );
	} );
} );
