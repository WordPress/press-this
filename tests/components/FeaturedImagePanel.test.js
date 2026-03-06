/**
 * Featured Image Panel Component Tests
 *
 * Uses source-reading pattern to verify component implementation.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'FeaturedImagePanel', () => {
	let sourceContent;

	beforeAll( () => {
		const sourcePath = path.resolve(
			__dirname,
			'../../src/components/FeaturedImagePanel.js'
		);
		sourceContent = fs.readFileSync( sourcePath, 'utf8' );
	} );

	describe( 'Component Structure', () => {
		test( 'exports a default function component', () => {
			expect( sourceContent ).toMatch(
				/export\s+default\s+function\s+FeaturedImagePanel/
			);
		} );

		test( 'renders within a PanelBody', () => {
			expect( sourceContent ).toContain( '<PanelBody' );
			expect( sourceContent ).toContain( '</PanelBody>' );
		} );

		test( 'accepts required props', () => {
			expect( sourceContent ).toContain( 'onSelect' );
			expect( sourceContent ).toContain( 'onRemove' );
			expect( sourceContent ).toContain( 'scrapedImages' );
			expect( sourceContent ).toContain( 'restConfig' );
			expect( sourceContent ).toContain( 'postId' );
		} );
	} );

	describe( 'Set Featured Image Button', () => {
		test( 'renders set featured image button when no image is set', () => {
			expect( sourceContent ).toContain( 'Set featured image' );
			expect( sourceContent ).toContain(
				'press-this-featured-image__set'
			);
		} );

		test( 'opens media library on click', () => {
			expect( sourceContent ).toContain( 'handleOpenMedia' );
			expect( sourceContent ).toContain( 'openMediaLibrary' );
		} );
	} );

	describe( 'Image Preview', () => {
		test( 'shows image preview when imageData is set', () => {
			expect( sourceContent ).toContain(
				'press-this-featured-image__preview'
			);
			expect( sourceContent ).toMatch(
				/imageData\s*&&\s*imageData\.url/
			);
		} );

		test( 'displays the image with alt text', () => {
			expect( sourceContent ).toContain(
				'press-this-featured-image__image'
			);
			expect( sourceContent ).toMatch(
				/alt=\{[^}]*imageData\.alt/
			);
		} );
	} );

	describe( 'Replace and Remove Buttons', () => {
		test( 'shows Replace button when image is set', () => {
			expect( sourceContent ).toContain(
				'press-this-featured-image__replace'
			);
			expect( sourceContent ).toMatch(
				/>\s*\{\s*__\(\s*'Replace'/
			);
		} );

		test( 'shows Remove button when image is set', () => {
			expect( sourceContent ).toContain(
				'press-this-featured-image__remove'
			);
			expect( sourceContent ).toMatch(
				/>\s*\{\s*__\(\s*'Remove'/
			);
		} );

		test( 'handleRemove clears imageData and calls onRemove', () => {
			expect( sourceContent ).toMatch(
				/const\s+handleRemove\s*=\s*useCallback/
			);
			expect( sourceContent ).toContain( 'setImageData( null )' );
			expect( sourceContent ).toContain( 'onRemove()' );
		} );
	} );

	describe( 'Scraped Images Section', () => {
		test( 'shows scraped images section when available and no image set', () => {
			expect( sourceContent ).toContain(
				'press-this-featured-image__scraped'
			);
			expect( sourceContent ).toContain( 'From Source' );
		} );

		test( 'filters scraped images by dimensions', () => {
			expect( sourceContent ).toContain( 'filterValidImages' );
			expect( sourceContent ).toMatch(
				/img\.width\s*>=\s*100\s*&&\s*img\.height\s*>=\s*100/
			);
		} );

		test( 'limits scraped images to first 12 for filtering', () => {
			expect( sourceContent ).toMatch(
				/scrapedImages\.slice\(\s*0\s*,\s*12\s*\)/
			);
		} );

		test( 'displays up to 6 scraped images', () => {
			expect( sourceContent ).toMatch(
				/validScrapedImages[\s\S]*?\.slice\(\s*0\s*,\s*6\s*\)/
			);
		} );
	} );

	describe( 'Sideload Functionality', () => {
		test( 'has handleScrapedImageSelect for sideloading', () => {
			expect( sourceContent ).toMatch(
				/const\s+handleScrapedImageSelect\s*=\s*useCallback/
			);
		} );

		test( 'calls sideloadImage with URL and restConfig', () => {
			expect( sourceContent ).toContain(
				'sideloadImage( url, restConfig, postId )'
			);
		} );

		test( 'shows spinner during sideloading', () => {
			expect( sourceContent ).toContain( '<Spinner' );
			expect( sourceContent ).toContain( 'isSideloading' );
			expect( sourceContent ).toContain( 'Uploading' );
		} );
	} );

	describe( 'Error Handling', () => {
		test( 'displays sideload error message', () => {
			expect( sourceContent ).toContain( 'sideloadError' );
			expect( sourceContent ).toContain(
				'press-this-featured-image__error'
			);
		} );

		test( 'shows error when REST config is missing', () => {
			expect( sourceContent ).toContain(
				'REST API configuration missing.'
			);
		} );

		test( 'catches and displays sideload failures', () => {
			expect( sourceContent ).toContain(
				'Failed to set featured image.'
			);
		} );
	} );
} );
