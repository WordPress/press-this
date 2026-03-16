/**
 * Tests for usePostFormatSuggestion hook and suggestPostFormat function.
 *
 * @package press-this
 */

import { suggestPostFormat } from '../../src/hooks/use-post-format-suggestion';

describe( 'suggestPostFormat', () => {
	const availableFormats = [
		'video',
		'audio',
		'quote',
		'link',
		'image',
		'status',
		'aside',
	];

	describe( 'Priority Order', () => {
		test( 'overrideFormat takes highest priority', () => {
			const result = suggestPostFormat( {
				overrideFormat: 'aside',
				phpSuggestion: 'video',
				defaultFormat: 'link',
				sourceUrl: 'https://youtube.com/watch?v=test',
				availableFormats,
			} );

			expect( result ).toBe( 'aside' );
		} );

		test( 'phpSuggestion takes priority over JS detection', () => {
			const result = suggestPostFormat( {
				phpSuggestion: 'quote',
				defaultFormat: 'link',
				sourceUrl: 'https://youtube.com/watch?v=test', // Would detect as video
				availableFormats,
			} );

			expect( result ).toBe( 'quote' );
		} );

		test( 'JS detection takes priority over defaultFormat', () => {
			const result = suggestPostFormat( {
				defaultFormat: 'aside',
				sourceUrl: 'https://youtube.com/watch?v=test',
				availableFormats,
			} );

			expect( result ).toBe( 'video' );
		} );

		test( 'defaultFormat is used when nothing else matches', () => {
			const result = suggestPostFormat( {
				defaultFormat: 'aside',
				// Content that won't match any detection (long enough to not be link-focused)
				content:
					'<p>This is a regular paragraph with enough content that it will not trigger link detection.</p><p>Another paragraph here.</p>',
				availableFormats,
			} );

			expect( result ).toBe( 'aside' );
		} );

		test( 'returns empty string when nothing matches and no default', () => {
			const result = suggestPostFormat( {
				// Content that won't match any detection
				content:
					'<p>This is a regular paragraph with enough content that it will not trigger link detection.</p><p>Another paragraph here.</p>',
				availableFormats,
			} );

			expect( result ).toBe( '' );
		} );
	} );

	describe( 'Override Format', () => {
		test( 'overrideFormat bypasses all detection', () => {
			const result = suggestPostFormat( {
				overrideFormat: 'status',
				content:
					'<blockquote><p>This is a quote that would normally trigger quote detection</p></blockquote>',
				embeds: [ 'https://vimeo.com/123456' ],
				sourceUrl: 'https://youtube.com/watch?v=test',
				availableFormats,
			} );

			expect( result ).toBe( 'status' );
		} );

		test( 'empty overrideFormat continues to phpSuggestion', () => {
			const result = suggestPostFormat( {
				overrideFormat: '',
				phpSuggestion: 'image',
				availableFormats,
			} );

			expect( result ).toBe( 'image' );
		} );
	} );

	describe( 'Default Format', () => {
		test( 'defaultFormat is not used when phpSuggestion exists', () => {
			const result = suggestPostFormat( {
				phpSuggestion: 'video',
				defaultFormat: 'link',
				availableFormats,
			} );

			expect( result ).toBe( 'video' );
		} );

		test( 'defaultFormat is not used when JS detection matches', () => {
			const result = suggestPostFormat( {
				defaultFormat: 'aside',
				sourceUrl: 'https://vimeo.com/123456789',
				availableFormats,
			} );

			expect( result ).toBe( 'video' );
		} );

		test( 'defaultFormat is used as fallback', () => {
			const result = suggestPostFormat( {
				defaultFormat: 'aside',
				content: '<p>Just a regular paragraph</p>',
				availableFormats,
			} );

			expect( result ).toBe( 'aside' );
		} );
	} );

	describe( 'Video Detection', () => {
		test( 'detects YouTube URL in sourceUrl', () => {
			const result = suggestPostFormat( {
				sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				availableFormats,
			} );

			expect( result ).toBe( 'video' );
		} );

		test( 'detects YouTube short URL', () => {
			const result = suggestPostFormat( {
				sourceUrl: 'https://youtu.be/dQw4w9WgXcQ',
				availableFormats,
			} );

			expect( result ).toBe( 'video' );
		} );

		test( 'detects Vimeo URL', () => {
			const result = suggestPostFormat( {
				sourceUrl: 'https://vimeo.com/123456789',
				availableFormats,
			} );

			expect( result ).toBe( 'video' );
		} );

		test( 'detects video in embeds array', () => {
			const result = suggestPostFormat( {
				embeds: [ 'https://www.youtube.com/watch?v=test123' ],
				availableFormats,
			} );

			expect( result ).toBe( 'video' );
		} );

		test( 'detects TikTok URL', () => {
			const result = suggestPostFormat( {
				sourceUrl: 'https://www.tiktok.com/@user/video/123456',
				availableFormats,
			} );

			expect( result ).toBe( 'video' );
		} );
	} );

	describe( 'Audio Detection', () => {
		test( 'detects SoundCloud URL', () => {
			const result = suggestPostFormat( {
				sourceUrl: 'https://soundcloud.com/artist/track',
				availableFormats,
			} );

			expect( result ).toBe( 'audio' );
		} );

		test( 'detects Spotify URL', () => {
			const result = suggestPostFormat( {
				sourceUrl: 'https://open.spotify.com/track/123456',
				availableFormats,
			} );

			expect( result ).toBe( 'audio' );
		} );
	} );

	describe( 'Status Detection', () => {
		test( 'detects Twitter/X status URL', () => {
			const result = suggestPostFormat( {
				sourceUrl: 'https://twitter.com/user/status/123456789',
				availableFormats,
			} );

			expect( result ).toBe( 'status' );
		} );

		test( 'detects X.com status URL', () => {
			const result = suggestPostFormat( {
				sourceUrl: 'https://x.com/user/status/123456789',
				availableFormats,
			} );

			expect( result ).toBe( 'status' );
		} );
	} );

	describe( 'Quote Detection', () => {
		test( 'detects blockquote in content', () => {
			const result = suggestPostFormat( {
				content: '<blockquote><p>A quoted passage</p></blockquote>',
				availableFormats,
			} );

			expect( result ).toBe( 'quote' );
		} );

		test( 'detects wp-block-quote in content', () => {
			const result = suggestPostFormat( {
				content:
					'<!-- wp:quote --><blockquote class="wp-block-quote"><p>Quote</p></blockquote><!-- /wp:quote -->',
				availableFormats,
			} );

			expect( result ).toBe( 'quote' );
		} );
	} );

	describe( 'Link Detection (removed)', () => {
		test( 'does not auto-suggest link format for URL with little content', () => {
			const result = suggestPostFormat( {
				sourceUrl: 'https://example.com/article',
				content: '',
				availableFormats,
			} );

			expect( result ).toBe( '' );
		} );

		test( 'does not auto-suggest link format for URL-only content', () => {
			const result = suggestPostFormat( {
				content: 'https://example.com/article',
				sourceUrl: 'https://example.com/article',
				availableFormats,
			} );

			expect( result ).toBe( '' );
		} );
	} );

	describe( 'Image Detection', () => {
		test( 'detects images with little text', () => {
			const result = suggestPostFormat( {
				images: [
					'https://example.com/image1.jpg',
					'https://example.com/image2.jpg',
				],
				content: '<p>Short</p>',
				availableFormats,
			} );

			expect( result ).toBe( 'image' );
		} );
	} );

	describe( 'Format Availability', () => {
		test( 'only suggests available formats', () => {
			const limitedFormats = [ 'link', 'quote' ]; // No 'video'

			const result = suggestPostFormat( {
				sourceUrl: 'https://youtube.com/watch?v=test',
				availableFormats: limitedFormats,
			} );

			// Video not available and link detection removed, so no match
			expect( result ).toBe( '' );
		} );

		test( 'defaultFormat used even if not in availableFormats', () => {
			// Default format should work regardless of theme support
			const result = suggestPostFormat( {
				defaultFormat: 'aside',
				content: '<p>Regular content</p>',
				availableFormats: [ 'link', 'quote' ], // No 'aside'
			} );

			expect( result ).toBe( 'aside' );
		} );

		test( 'overrideFormat used even if not in availableFormats', () => {
			const result = suggestPostFormat( {
				overrideFormat: 'gallery',
				availableFormats: [ 'link', 'quote' ], // No 'gallery'
			} );

			expect( result ).toBe( 'gallery' );
		} );
	} );

	describe( 'Edge Cases', () => {
		test( 'handles empty options', () => {
			const result = suggestPostFormat( {} );

			expect( result ).toBe( '' );
		} );

		test( 'handles undefined values', () => {
			const result = suggestPostFormat( {
				content: undefined,
				embeds: undefined,
				images: undefined,
				sourceUrl: undefined,
				availableFormats: undefined,
				phpSuggestion: undefined,
				overrideFormat: undefined,
				defaultFormat: undefined,
			} );

			expect( result ).toBe( '' );
		} );

		test( 'handles null values gracefully', () => {
			const result = suggestPostFormat( {
				content: null,
				embeds: null,
				images: null,
			} );

			expect( result ).toBe( '' );
		} );
	} );
} );
