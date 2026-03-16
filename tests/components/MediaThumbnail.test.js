/**
 * MediaThumbnail Component Tests
 *
 * Tests for utility functions (extracted from source) and component patterns.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

let getMediaType;
let getDisplayUrl;
let sourceContent;

beforeAll( () => {
	const sourcePath = path.resolve(
		__dirname,
		'../../src/components/MediaThumbnail.js'
	);
	sourceContent = fs.readFileSync( sourcePath, 'utf8' );

	// Extract getMediaType function.
	const mediaTypeMatch = sourceContent.match(
		/function getMediaType\(\s*src\s*,\s*isEmbed\s*\)\s*\{([\s\S]*?)^\}/m
	);
	if ( mediaTypeMatch ) {
		// eslint-disable-next-line no-new-func
		getMediaType = new Function( 'src', 'isEmbed', mediaTypeMatch[ 1 ] );
	}

	// Extract getDisplayUrl function.
	const displayUrlMatch = sourceContent.match(
		/function getDisplayUrl\(\s*src\s*,\s*type\s*(?:,\s*smallWidth\s*=\s*128\s*)?\)\s*\{([\s\S]*?)^\}/m
	);
	if ( displayUrlMatch ) {
		// eslint-disable-next-line no-new-func
		getDisplayUrl = new Function(
			'src',
			'type',
			'smallWidth',
			displayUrlMatch[ 1 ]
		);
	}
} );

describe( 'getMediaType', () => {
	test( 'returns image for non-embed', () => {
		expect( getMediaType( 'https://example.com/photo.jpg', false ) ).toBe(
			'image'
		);
	} );

	test( 'returns video for YouTube', () => {
		expect(
			getMediaType( 'https://www.youtube.com/watch?v=test', true )
		).toBe( 'video' );
	} );

	test( 'returns video for youtu.be', () => {
		expect(
			getMediaType( 'https://youtu.be/test123', true )
		).toBe( 'video' );
	} );

	test( 'returns video for Vimeo', () => {
		expect(
			getMediaType( 'https://vimeo.com/123456', true )
		).toBe( 'video' );
	} );

	test( 'returns video for Dailymotion', () => {
		expect(
			getMediaType( 'https://www.dailymotion.com/video/x7tgad', true )
		).toBe( 'video' );
	} );

	test( 'returns audio for SoundCloud', () => {
		expect(
			getMediaType( 'https://soundcloud.com/artist/track', true )
		).toBe( 'audio' );
	} );

	test( 'returns audio for Spotify', () => {
		expect(
			getMediaType( 'https://open.spotify.com/track/123', true )
		).toBe( 'audio' );
	} );

	test( 'returns tweet for twitter.com', () => {
		expect(
			getMediaType( 'https://twitter.com/user/status/123', true )
		).toBe( 'tweet' );
	} );

	test( 'returns tweet for x.com', () => {
		expect(
			getMediaType( 'https://x.com/user/status/123', true )
		).toBe( 'tweet' );
	} );

	test( 'returns embed for unknown embed type', () => {
		expect(
			getMediaType( 'https://unknown-service.com/embed/123', true )
		).toBe( 'embed' );
	} );
} );

describe( 'getDisplayUrl', () => {
	test( 'returns YouTube thumbnail for youtube.com watch URL', () => {
		const result = getDisplayUrl(
			'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			'video',
			128
		);
		expect( result ).toBe(
			'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
		);
	} );

	test( 'returns YouTube thumbnail for youtu.be URL', () => {
		const result = getDisplayUrl(
			'https://youtu.be/dQw4w9WgXcQ',
			'video',
			128
		);
		expect( result ).toBe(
			'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
		);
	} );

	test( 'returns Dailymotion thumbnail URL', () => {
		const result = getDisplayUrl(
			'https://www.dailymotion.com/video/x7tgad0',
			'video',
			128
		);
		expect( result ).toContain( '/thumbnail/video/' );
	} );

	test( 'returns Vimeo URL as empty (no thumbnail extraction)', () => {
		const result = getDisplayUrl(
			'https://vimeo.com/123456',
			'video',
			128
		);
		expect( result ).toBe( '' );
	} );

	test( 'returns the image URL for image type', () => {
		const result = getDisplayUrl(
			'https://example.com/photo.jpg',
			'image',
			128
		);
		expect( result ).toContain( 'example.com/photo.jpg' );
	} );

	test( 'adds ?w= for WordPress.com URLs', () => {
		const result = getDisplayUrl(
			'https://site.files.wordpress.com/2024/01/photo.jpg',
			'image',
			128
		);
		expect( result ).toContain( '?w=128' );
	} );

	test( 'adds ?s= for Gravatar URLs', () => {
		const result = getDisplayUrl(
			'https://secure.gravatar.com/avatar/abc123',
			'image',
			128
		);
		expect( result ).toContain( '?s=128' );
	} );
} );

describe( 'MediaThumbnail - Component', () => {
	test( 'exports a default function component', () => {
		expect( sourceContent ).toMatch(
			/export\s+default\s+function\s+MediaThumbnail/
		);
	} );

	test( 'renders with role="button"', () => {
		expect( sourceContent ).toContain( 'role="button"' );
	} );

	test( 'has aria-label for accessibility', () => {
		expect( sourceContent ).toContain( 'aria-label=' );
		expect( sourceContent ).toContain( 'accessibleLabel' );
	} );

	test( 'has aria-pressed for featured state', () => {
		expect( sourceContent ).toMatch(
			/aria-pressed=\{\s*isFeatured\s*\}/
		);
	} );

	test( 'handles click to insert', () => {
		expect( sourceContent ).toContain( 'onClick={ handleInsert }' );
		expect( sourceContent ).toMatch(
			/const\s+handleInsert\s*=\s*useCallback/
		);
	} );

	test( 'handles keyboard interaction (Enter and Space)', () => {
		expect( sourceContent ).toContain( 'onKeyDown={ handleKeyDown }' );
		expect( sourceContent ).toMatch(
			/event\.key\s*===\s*'Enter'\s*\|\|\s*event\.key\s*===\s*' '/
		);
	} );

	test( 'shows featured badge when isFeatured is true', () => {
		expect( sourceContent ).toContain(
			'press-this-media-thumbnail__featured-badge'
		);
		expect( sourceContent ).toContain( 'Featured' );
	} );

	test( 'has Insert Image and Insert Embed labels', () => {
		expect( sourceContent ).toContain( 'Insert Image' );
		expect( sourceContent ).toContain( 'Insert Embed' );
	} );

	test( 'has Set Featured and Remove Featured buttons for images', () => {
		expect( sourceContent ).toContain( 'Set Featured' );
		expect( sourceContent ).toContain( 'Remove Featured' );
	} );

	test( 'does not show featured button for embeds', () => {
		expect( sourceContent ).toMatch(
			/!\s*isEmbed\s*&&\s*\(/
		);
	} );
} );
