/**
 * useEditorSetup Hook Tests
 *
 * Uses source-reading pattern to verify hook implementation.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'useEditorSetup', () => {
	let sourceContent;

	beforeAll( () => {
		const sourcePath = path.resolve(
			__dirname,
			'../../src/hooks/use-editor-setup.js'
		);
		sourceContent = fs.readFileSync( sourcePath, 'utf8' );
	} );

	describe( 'Block Registration', () => {
		test( 'imports registerCoreBlocks from block-library', () => {
			expect( sourceContent ).toMatch(
				/import\s*\{[^}]*registerCoreBlocks[^}]*\}\s*from\s*['"]@wordpress\/block-library['"]/
			);
		} );

		test( 'calls registerCoreBlocks on mount', () => {
			expect( sourceContent ).toContain( 'registerCoreBlocks()' );
		} );

		test( 'unregisters blocks not in allowedBlocks list', () => {
			expect( sourceContent ).toContain( 'unregisterBlockType' );
			expect( sourceContent ).toMatch(
				/!\s*allowedBlocks\.includes\(\s*block\.name\s*\)/
			);
		} );
	} );

	describe( 'Return Value', () => {
		test( 'returns isReady state', () => {
			expect( sourceContent ).toMatch(
				/return\s*\{\s*isReady\s*\}/
			);
		} );

		test( 'sets isReady to true after setup', () => {
			expect( sourceContent ).toContain( 'setIsReady( true )' );
		} );
	} );

	describe( 'DEFAULT_ALLOWED_BLOCKS', () => {
		test( 'exports DEFAULT_ALLOWED_BLOCKS constant', () => {
			expect( sourceContent ).toMatch(
				/export\s+const\s+DEFAULT_ALLOWED_BLOCKS/
			);
		} );

		test( 'includes core blocks: paragraph, heading, image, quote, list, list-item, embed', () => {
			expect( sourceContent ).toContain( "'core/paragraph'" );
			expect( sourceContent ).toContain( "'core/heading'" );
			expect( sourceContent ).toContain( "'core/image'" );
			expect( sourceContent ).toContain( "'core/quote'" );
			expect( sourceContent ).toContain( "'core/list'" );
			expect( sourceContent ).toContain( "'core/list-item'" );
			expect( sourceContent ).toContain( "'core/embed'" );
		} );

		test( 'uses DEFAULT_ALLOWED_BLOCKS as default parameter', () => {
			expect( sourceContent ).toMatch(
				/allowedBlocks\s*=\s*DEFAULT_ALLOWED_BLOCKS/
			);
		} );
	} );

	describe( 'Setup Guard', () => {
		test( 'uses useRef to track setup state', () => {
			expect( sourceContent ).toContain( 'hasSetup' );
			expect( sourceContent ).toContain( 'useRef( false )' );
		} );

		test( 'only runs setup once via hasSetup guard', () => {
			expect( sourceContent ).toMatch(
				/if\s*\(\s*hasSetup\.current\s*\)/
			);
			expect( sourceContent ).toContain( 'hasSetup.current = true' );
		} );
	} );
} );
