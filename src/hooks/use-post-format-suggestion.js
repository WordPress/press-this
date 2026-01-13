/**
 * usePostFormatSuggestion Hook
 *
 * Analyzes content to suggest an appropriate post format based on content type.
 * Detects video embeds, quote-heavy content, and link-focused content.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { useMemo } from '@wordpress/element';

/**
 * Video embed URL patterns.
 */
const VIDEO_PATTERNS = [
	/youtube\.com\/watch/i,
	/youtu\.be\//i,
	/vimeo\.com\//i,
	/dailymotion\.com\/video/i,
	/dai\.ly\//i,
	/videopress\.com\//i,
	/wordpress\.tv\//i,
	/wistia\.com\//i,
	/wistia\.net\//i,
	/tiktok\.com\//i,
	/vine\.co\//i,
];

/**
 * Audio embed URL patterns.
 */
const AUDIO_PATTERNS = [
	/soundcloud\.com\//i,
	/spotify\.com\//i,
	/mixcloud\.com\//i,
	/bandcamp\.com\//i,
];

/**
 * Social/status URL patterns.
 */
const STATUS_PATTERNS = [
	/twitter\.com\/.*\/status\//i,
	/x\.com\/.*\/status\//i,
	/facebook\.com\/.*\/posts\//i,
	/instagram\.com\/p\//i,
	/mastodon\..+\//i,
];

/**
 * Check if content contains video embed.
 *
 * @param {string} content   Post content to analyze.
 * @param {Array}  embeds    Array of embed URLs from scraped data.
 * @param {string} sourceUrl The source URL being clipped.
 * @return {boolean} True if video content detected.
 */
function hasVideoContent( content = '', embeds = [], sourceUrl = '' ) {
	// Check embeds array.
	if ( embeds && embeds.length > 0 ) {
		for ( const embed of embeds ) {
			for ( const pattern of VIDEO_PATTERNS ) {
				if ( pattern.test( embed ) ) {
					return true;
				}
			}
		}
	}

	// Check source URL.
	for ( const pattern of VIDEO_PATTERNS ) {
		if ( pattern.test( sourceUrl ) ) {
			return true;
		}
	}

	// Check content for embed shortcodes or iframe with video.
	if ( content ) {
		// Check for [embed] shortcode with video URL.
		const embedMatches =
			content.match( /\[embed\]([^[]+)\[\/embed\]/gi ) || [];
		for ( const match of embedMatches ) {
			for ( const pattern of VIDEO_PATTERNS ) {
				if ( pattern.test( match ) ) {
					return true;
				}
			}
		}

		// Check for video block or iframe.
		if (
			content.includes( 'wp-block-embed is-type-video' ) ||
			content.includes( 'wp-block-video' ) ||
			( content.includes( '<iframe' ) &&
				VIDEO_PATTERNS.some( ( p ) => p.test( content ) ) )
		) {
			return true;
		}
	}

	return false;
}

/**
 * Check if content contains audio embed.
 *
 * @param {string} content   Post content to analyze.
 * @param {Array}  embeds    Array of embed URLs from scraped data.
 * @param {string} sourceUrl The source URL being clipped.
 * @return {boolean} True if audio content detected.
 */
function hasAudioContent( content = '', embeds = [], sourceUrl = '' ) {
	// Check embeds array.
	if ( embeds && embeds.length > 0 ) {
		for ( const embed of embeds ) {
			for ( const pattern of AUDIO_PATTERNS ) {
				if ( pattern.test( embed ) ) {
					return true;
				}
			}
		}
	}

	// Check source URL.
	for ( const pattern of AUDIO_PATTERNS ) {
		if ( pattern.test( sourceUrl ) ) {
			return true;
		}
	}

	// Check content for audio blocks.
	if ( content && content.includes( 'wp-block-audio' ) ) {
		return true;
	}

	return false;
}

/**
 * Check if content is quote-heavy.
 *
 * @param {string} content Post content to analyze.
 * @return {boolean} True if quote-heavy content detected.
 */
function hasQuoteContent( content = '' ) {
	if ( ! content ) {
		return false;
	}

	// Count blockquote elements or quote blocks.
	const blockquoteCount = ( content.match( /<blockquote/gi ) || [] ).length;
	const quoteBlockCount = ( content.match( /wp-block-quote/gi ) || [] )
		.length;
	const totalQuotes = blockquoteCount + quoteBlockCount;

	// Count total block elements (paragraphs, headings, etc.).
	const paragraphCount = ( content.match( /<p[^>]*>/gi ) || [] ).length;
	const headingCount = ( content.match( /<h[1-6][^>]*>/gi ) || [] ).length;
	const totalBlocks = paragraphCount + headingCount + totalQuotes;

	// If quotes make up more than 50% of content, suggest quote format.
	if ( totalBlocks > 0 && totalQuotes / totalBlocks > 0.5 ) {
		return true;
	}

	// If there's mostly just a blockquote with minimal other content.
	if ( totalQuotes > 0 && totalBlocks <= 3 ) {
		return true;
	}

	return false;
}

/**
 * Check if content is link-focused.
 *
 * @param {string} content   Post content to analyze.
 * @param {string} sourceUrl The source URL being clipped.
 * @return {boolean} True if link-focused content detected.
 */
function hasLinkContent( content = '', sourceUrl = '' ) {
	if ( ! content && ! sourceUrl ) {
		return false;
	}

	// If we have a source URL but very little content, it's link-focused.
	if ( sourceUrl && ( ! content || content.length < 100 ) ) {
		return true;
	}

	if ( ! content ) {
		return false;
	}

	// Count links in content.
	const linkCount = ( content.match( /<a[^>]+href/gi ) || [] ).length;
	const paragraphCount = ( content.match( /<p[^>]*>/gi ) || [] ).length;

	// If we have many links relative to paragraphs, suggest link format.
	if ( paragraphCount > 0 && linkCount / paragraphCount > 0.8 ) {
		return true;
	}

	// Check if content is primarily a URL.
	const trimmedContent = content.replace( /<[^>]+>/g, '' ).trim();
	if ( /^https?:\/\/[^\s]+$/.test( trimmedContent ) ) {
		return true;
	}

	return false;
}

/**
 * Check if content is status/social media-like.
 *
 * @param {string} content   Post content to analyze.
 * @param {Array}  embeds    Array of embed URLs from scraped data.
 * @param {string} sourceUrl The source URL being clipped.
 * @return {boolean} True if status content detected.
 */
function hasStatusContent( content = '', embeds = [], sourceUrl = '' ) {
	// Check source URL.
	for ( const pattern of STATUS_PATTERNS ) {
		if ( pattern.test( sourceUrl ) ) {
			return true;
		}
	}

	// Check embeds.
	if ( embeds && embeds.length > 0 ) {
		for ( const embed of embeds ) {
			for ( const pattern of STATUS_PATTERNS ) {
				if ( pattern.test( embed ) ) {
					return true;
				}
			}
		}
	}

	// Check for Twitter/X embeds in content.
	if (
		content &&
		( content.includes( 'twitter-tweet' ) ||
			content.includes( 'wp-block-embed-twitter' ) )
	) {
		return true;
	}

	return false;
}

/**
 * Check if content is image-focused.
 *
 * @param {string} content Post content to analyze.
 * @param {Array}  images  Array of image URLs from scraped data.
 * @return {boolean} True if image-focused content detected.
 */
function hasImageContent( content = '', images = [] ) {
	// If we have images but little text content.
	if ( images && images.length > 0 ) {
		const textContent = content
			? content.replace( /<[^>]+>/g, '' ).trim()
			: '';
		if ( textContent.length < 50 ) {
			return true;
		}
	}

	// Count images in content.
	if ( content ) {
		const imageCount =
			( content.match( /<img/gi ) || [] ).length +
			( content.match( /wp-block-image/gi ) || [] ).length;
		const paragraphCount = ( content.match( /<p[^>]*>/gi ) || [] ).length;

		// If images dominate the content.
		if ( imageCount > 0 && paragraphCount <= imageCount ) {
			return true;
		}
	}

	return false;
}

/**
 * Suggest a post format based on content analysis.
 *
 * Priority order:
 * 1. overrideFormat - Hard override from PHP filter (always wins)
 * 2. phpSuggestion - PHP suggestion based on content analysis
 * 3. JS detection - Client-side content analysis
 * 4. defaultFormat - Fallback from PHP filter when nothing matches
 *
 * @param {Object} options                  Analysis options.
 * @param {string} options.content          Post content.
 * @param {Array}  options.embeds           Scraped embed URLs.
 * @param {Array}  options.images           Scraped image URLs.
 * @param {string} options.sourceUrl        Source URL being clipped.
 * @param {Array}  options.availableFormats Available formats from theme.
 * @param {string} options.phpSuggestion    Suggestion from PHP content analysis.
 * @param {string} options.overrideFormat   Hard override from PHP filter (bypasses all detection).
 * @param {string} options.defaultFormat    Fallback format from PHP filter (used when no match).
 * @return {string} Suggested format value or empty string.
 */
export function suggestPostFormat( {
	content = '',
	embeds = [],
	images = [],
	sourceUrl = '',
	availableFormats = [],
	phpSuggestion = '',
	overrideFormat = '',
	defaultFormat = '',
} ) {
	// Priority 1: Hard override from PHP filter (always wins).
	if ( overrideFormat ) {
		return overrideFormat;
	}

	// Priority 2: PHP suggestion based on content analysis.
	if ( phpSuggestion ) {
		return phpSuggestion;
	}

	// Get list of available format values.
	const availableFormatValues = availableFormats.map( ( f ) =>
		typeof f === 'string' ? f : f.value
	);

	// Helper to check if format is available.
	const isFormatAvailable = ( format ) =>
		availableFormatValues.includes( format );

	// Check for video content.
	if (
		isFormatAvailable( 'video' ) &&
		hasVideoContent( content, embeds, sourceUrl )
	) {
		return 'video';
	}

	// Check for audio content.
	if (
		isFormatAvailable( 'audio' ) &&
		hasAudioContent( content, embeds, sourceUrl )
	) {
		return 'audio';
	}

	// Check for status/social content.
	if (
		isFormatAvailable( 'status' ) &&
		hasStatusContent( content, embeds, sourceUrl )
	) {
		return 'status';
	}

	// Check for quote-heavy content.
	if ( isFormatAvailable( 'quote' ) && hasQuoteContent( content ) ) {
		return 'quote';
	}

	// Check for image-focused content.
	if ( isFormatAvailable( 'image' ) && hasImageContent( content, images ) ) {
		return 'image';
	}

	// Check for link-focused content.
	if ( isFormatAvailable( 'link' ) && hasLinkContent( content, sourceUrl ) ) {
		return 'link';
	}

	// Priority 4: Fallback to default format from PHP filter.
	if ( defaultFormat ) {
		return defaultFormat;
	}

	// Default: no suggestion (will use standard).
	return '';
}

/**
 * Custom hook to suggest post format based on content.
 *
 * @param {Object} options                  Hook options.
 * @param {string} options.content          Post content to analyze.
 * @param {Array}  options.embeds           Scraped embed URLs.
 * @param {Array}  options.images           Scraped image URLs.
 * @param {string} options.sourceUrl        Source URL being clipped.
 * @param {Array}  options.availableFormats Available formats from theme.
 * @param {string} options.phpSuggestion    Suggestion from PHP content analysis.
 * @param {string} options.overrideFormat   Hard override from PHP filter.
 * @param {string} options.defaultFormat    Fallback format from PHP filter.
 * @return {string} Suggested post format.
 */
export default function usePostFormatSuggestion( {
	content = '',
	embeds = [],
	images = [],
	sourceUrl = '',
	availableFormats = [],
	phpSuggestion = '',
	overrideFormat = '',
	defaultFormat = '',
} ) {
	const suggestion = useMemo( () => {
		return suggestPostFormat( {
			content,
			embeds,
			images,
			sourceUrl,
			availableFormats,
			phpSuggestion,
			overrideFormat,
			defaultFormat,
		} );
	}, [
		content,
		embeds,
		images,
		sourceUrl,
		availableFormats,
		phpSuggestion,
		overrideFormat,
		defaultFormat,
	] );

	return suggestion;
}
