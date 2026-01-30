/**
 * HTML Parser Utilities
 *
 * Client-side parsing of HTML to extract metadata for Press This.
 *
 * @package
 */

/**
 * Escape HTML special characters.
 *
 * Escapes dangerous HTML characters.
 * Escapes: & < > " '
 *
 * @param {string} str String to escape.
 * @return {string} Escaped string.
 */
export function escapeHtml( str ) {
	if ( typeof str !== 'string' ) {
		return '';
	}

	return str
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /"/g, '&quot;' )
		.replace( /'/g, '&#039;' );
}

/**
 * Escape attribute value special characters.
 *
 * Escapes values for use in HTML attributes.
 * Escapes: & " '
 *
 * @param {string} str String to escape.
 * @return {string} Escaped string.
 */
export function escapeAttr( str ) {
	if ( typeof str !== 'string' ) {
		return '';
	}

	return str
		.replace( /&/g, '&amp;' )
		.replace( /"/g, '&quot;' )
		.replace( /'/g, '&#039;' );
}

/**
 * Parse HTML string and extract metadata.
 *
 * @param {string} html    The HTML content to parse.
 * @param {string} baseUrl The base URL for resolving relative URLs.
 * @return {Object} Extracted metadata.
 */
export function parseHtmlMetadata( html, baseUrl ) {
	const parser = new DOMParser();
	const doc = parser.parseFromString( html, 'text/html' );

	// Extract various metadata.
	const meta = extractMetaTags( doc );
	const jsonLd = extractJsonLd( doc );
	const images = extractImages( doc, baseUrl );
	const embeds = extractEmbeds( doc, baseUrl );

	// Build result with priority fallbacks.
	return {
		title: getTitle( doc, meta, jsonLd ),
		description: getDescription( doc, meta, jsonLd ),
		siteName: getSiteName( meta ),
		image: getMainImage( meta, jsonLd ),
		images,
		embeds,
		canonical: getCanonical( doc, meta ),
	};
}

/**
 * Extract meta tags from document.
 *
 * @param {Document} doc Parsed HTML document.
 * @return {Object} Meta tag values keyed by name/property.
 */
function extractMetaTags( doc ) {
	const meta = {};
	const metaTags = doc.querySelectorAll( 'meta[property], meta[name]' );

	metaTags.forEach( ( tag ) => {
		const key = tag.getAttribute( 'property' ) || tag.getAttribute( 'name' );
		const content = tag.getAttribute( 'content' );
		if ( key && content ) {
			meta[ key.toLowerCase() ] = content;
		}
	} );

	return meta;
}

/**
 * Extract JSON-LD structured data.
 *
 * @param {Document} doc Parsed HTML document.
 * @return {Object} JSON-LD data or empty object.
 */
function extractJsonLd( doc ) {
	const scripts = doc.querySelectorAll( 'script[type="application/ld+json"]' );
	let result = {};

	scripts.forEach( ( script ) => {
		try {
			const data = JSON.parse( script.textContent );
			// Handle both single objects and arrays.
			const items = Array.isArray( data ) ? data : [ data ];

			items.forEach( ( item ) => {
				// Look for Article, NewsArticle, BlogPosting, WebPage types.
				if ( item[ '@type' ] && /Article|BlogPosting|WebPage|NewsArticle/i.test( item[ '@type' ] ) ) {
					if ( item.headline ) {
						result.headline = item.headline;
					}
					if ( item.description ) {
						result.description = item.description;
					}
					if ( item.image ) {
						// Image can be a string, object, or array.
						if ( typeof item.image === 'string' ) {
							result.image = item.image;
						} else if ( item.image.url ) {
							result.image = item.image.url;
						} else if ( Array.isArray( item.image ) && item.image[ 0 ] ) {
							result.image = typeof item.image[ 0 ] === 'string' ? item.image[ 0 ] : item.image[ 0 ].url;
						}
					}
					if ( item.mainEntityOfPage ) {
						result.canonical = typeof item.mainEntityOfPage === 'string'
							? item.mainEntityOfPage
							: item.mainEntityOfPage[ '@id' ];
					}
				}
			} );
		} catch ( e ) {
			// Ignore invalid JSON-LD.
		}
	} );

	return result;
}

/**
 * Extract images from document.
 *
 * @param {Document} doc     Parsed HTML document.
 * @param {string}   baseUrl Base URL for resolving relative URLs.
 * @return {Array} Array of image URLs.
 */
function extractImages( doc, baseUrl ) {
	const images = [];
	const seen = new Set();

	// Get images from img tags.
	const imgTags = doc.querySelectorAll( 'img[src]' );
	imgTags.forEach( ( img ) => {
		const src = resolveUrl( img.getAttribute( 'src' ), baseUrl );
		if ( src && isValidImageUrl( src ) && ! seen.has( src ) ) {
			seen.add( src );
			images.push( src );
		}
	} );

	// Limit to 20 images.
	return images.slice( 0, 20 );
}

/**
 * Extract embeds from document.
 *
 * @param {Document} doc     Parsed HTML document.
 * @param {string}   baseUrl Base URL for resolving relative URLs.
 * @return {Array} Array of embed URLs.
 */
function extractEmbeds( doc, baseUrl ) {
	const embeds = [];
	const seen = new Set();

	// Check iframes for video embeds.
	const iframes = doc.querySelectorAll( 'iframe[src]' );
	iframes.forEach( ( iframe ) => {
		const src = iframe.getAttribute( 'src' );
		const normalized = normalizeEmbedUrl( src );
		if ( normalized && ! seen.has( normalized ) ) {
			seen.add( normalized );
			embeds.push( normalized );
		}
	} );

	// Check for video tags.
	const videos = doc.querySelectorAll( 'video source[src], video[src]' );
	videos.forEach( ( video ) => {
		const src = video.getAttribute( 'src' );
		if ( src && ! seen.has( src ) ) {
			seen.add( src );
			embeds.push( resolveUrl( src, baseUrl ) );
		}
	} );

	return embeds;
}

/**
 * Normalize embed URL to canonical form.
 *
 * @param {string} src Embed source URL.
 * @return {string|null} Normalized URL or null if not a known embed.
 */
function normalizeEmbedUrl( src ) {
	if ( ! src ) {
		return null;
	}

	// YouTube embed to watch URL.
	let match = src.match( /(?:youtube\.com|youtube-nocookie\.com)\/embed\/([^?/]+)/ );
	if ( match ) {
		return `https://www.youtube.com/watch?v=${ match[ 1 ] }`;
	}

	// Vimeo embed.
	match = src.match( /player\.vimeo\.com\/video\/(\d+)/ );
	if ( match ) {
		return `https://vimeo.com/${ match[ 1 ] }`;
	}

	// Dailymotion embed.
	match = src.match( /dailymotion\.com\/embed\/video\/([^?/]+)/ );
	if ( match ) {
		return `https://www.dailymotion.com/video/${ match[ 1 ] }`;
	}

	// Twitter/X embed.
	if ( /twitter\.com|x\.com/.test( src ) ) {
		return src;
	}

	return null;
}

/**
 * Check if URL is a valid image URL.
 *
 * @param {string} url URL to check.
 * @return {boolean} True if valid image URL.
 */
function isValidImageUrl( url ) {
	if ( ! url || ! url.startsWith( 'http' ) ) {
		return false;
	}

	// Skip common non-content images.
	const skipPatterns = [
		/\/ad[sx]?\//i,
		/share-?this/i,
		/spinner|loading|spacer|blank/i,
		/gravatar\.com.*\?s=\d{1,2}$/i, // Small gravatars.
		/\.(gif|png)\?.*tracking/i,
		/pixel\.(mathtag|quantserve)\.com/i,
		/wp-includes\//,
		/[gb]\.gif$/i,
	];

	for ( const pattern of skipPatterns ) {
		if ( pattern.test( url ) ) {
			return false;
		}
	}

	return true;
}

/**
 * Resolve a potentially relative URL.
 *
 * @param {string} url     URL to resolve.
 * @param {string} baseUrl Base URL.
 * @return {string} Absolute URL.
 */
function resolveUrl( url, baseUrl ) {
	if ( ! url ) {
		return '';
	}

	// Already absolute.
	if ( url.startsWith( 'http://' ) || url.startsWith( 'https://' ) ) {
		return url;
	}

	// Protocol-relative.
	if ( url.startsWith( '//' ) ) {
		return 'https:' + url;
	}

	// Data URLs - skip.
	if ( url.startsWith( 'data:' ) ) {
		return '';
	}

	try {
		return new URL( url, baseUrl ).href;
	} catch ( e ) {
		return '';
	}
}

/**
 * Get the page title with fallbacks.
 *
 * @param {Document} doc    Parsed document.
 * @param {Object}   meta   Meta tags.
 * @param {Object}   jsonLd JSON-LD data.
 * @return {string} Page title.
 */
function getTitle( doc, meta, jsonLd ) {
	return (
		meta[ 'og:title' ] ||
		meta[ 'twitter:title' ] ||
		jsonLd.headline ||
		doc.querySelector( 'title' )?.textContent?.trim() ||
		''
	);
}

/**
 * Get the page description with fallbacks.
 *
 * @param {Document} doc    Parsed document.
 * @param {Object}   meta   Meta tags.
 * @param {Object}   jsonLd JSON-LD data.
 * @return {string} Page description.
 */
function getDescription( doc, meta, jsonLd ) {
	let desc =
		meta[ 'og:description' ] ||
		meta[ 'twitter:description' ] ||
		jsonLd.description ||
		meta.description ||
		'';

	// Fallback: extract first paragraph from article content.
	if ( ! desc ) {
		desc = extractFirstParagraph( doc );
	}

	return desc;
}

/**
 * Extract the first meaningful paragraph from the document.
 *
 * @param {Document} doc Parsed document.
 * @return {string} First paragraph text or empty string.
 */
function extractFirstParagraph( doc ) {
	// Look for article content in common containers.
	const contentSelectors = [
		'article p',
		'.entry-content p',
		'.post-content p',
		'.article-content p',
		'.content p',
		'main p',
		'.hentry p',
	];

	for ( const selector of contentSelectors ) {
		const paragraphs = doc.querySelectorAll( selector );
		for ( const p of paragraphs ) {
			const text = p.textContent?.trim();
			// Skip very short paragraphs (likely not real content).
			if ( text && text.length > 50 ) {
				// Limit to reasonable length.
				return text.length > 300 ? text.substring( 0, 297 ) + '...' : text;
			}
		}
	}

	return '';
}

/**
 * Get the site name.
 *
 * @param {Object} meta Meta tags.
 * @return {string} Site name.
 */
function getSiteName( meta ) {
	return meta[ 'og:site_name' ] || meta[ 'application-name' ] || '';
}

/**
 * Get the main image with fallbacks.
 *
 * @param {Object} meta   Meta tags.
 * @param {Object} jsonLd JSON-LD data.
 * @return {string} Main image URL.
 */
function getMainImage( meta, jsonLd ) {
	return (
		meta[ 'og:image' ] ||
		meta[ 'og:image:secure_url' ] ||
		meta[ 'twitter:image' ] ||
		meta[ 'twitter:image:src' ] ||
		jsonLd.image ||
		''
	);
}

/**
 * Get the canonical URL.
 *
 * @param {Document} doc  Parsed document.
 * @param {Object}   meta Meta tags.
 * @return {string} Canonical URL.
 */
function getCanonical( doc, meta ) {
	const linkCanonical = doc.querySelector( 'link[rel="canonical"]' );
	return (
		linkCanonical?.getAttribute( 'href' ) ||
		meta[ 'og:url' ] ||
		''
	);
}

/**
 * Build suggested content from server-returned metadata.
 *
 * All dynamic content is escaped.
 * Uses pre-sanitized server data instead of client-side parsing.
 *
 * @param {Object} data      Server-returned metadata object.
 * @param {string} sourceUrl Original source URL.
 * @return {string} Gutenberg block content.
 */
export function buildSuggestedContent( data, sourceUrl ) {
	let content = '';

	// Check if source URL is an embeddable video.
	const isEmbed = isEmbeddableUrl( sourceUrl );

	if ( isEmbed ) {
		// Escape URL in JSON attribute.
		const escapedUrl = escapeAttr( sourceUrl );
		const provider = getEmbedProvider( sourceUrl );

		// Add embed block.
		content += `<!-- wp:embed {"url":"${ escapedUrl }","type":"video","providerNameSlug":"${ provider }"} -->
<figure class="wp-block-embed is-type-video is-provider-${ provider }"><div class="wp-block-embed__wrapper">
${ escapeHtml( sourceUrl ) }
</div></figure>
<!-- /wp:embed -->

`;
	}

	// Add quote block with description if available.
	// Escape description.
	if ( data.description ) {
		content += `<!-- wp:quote -->
<blockquote class="wp-block-quote"><!-- wp:paragraph -->
<p>${ escapeHtml( data.description ) }</p>
<!-- /wp:paragraph --></blockquote>
<!-- /wp:quote -->

`;
	}

	// Add source attribution.
	// Escape link text.
	const linkText = data.title || data.siteName || sourceUrl;
	content += `<!-- wp:paragraph -->
<p>Source: <em><a href="${ escapeAttr( sourceUrl ) }">${ escapeHtml( linkText ) }</a></em></p>
<!-- /wp:paragraph -->`;

	return content;
}

/**
 * Build suggested content from server-returned metadata.
 *
 * This is the primary function for building content from the scrape endpoint.
 * All dynamic content is escaped.
 * Uses pre-sanitized server data.
 *
 * @param {Object} data Server metadata with title, description, images, embeds.
 * @return {string} Gutenberg block content.
 */
export function buildSuggestedContentFromMetadata( data ) {
	return buildSuggestedContent( data, data.canonical || data.url || '' );
}

/**
 * Check if URL is embeddable.
 *
 * @param {string} url URL to check.
 * @return {boolean} True if embeddable.
 */
function isEmbeddableUrl( url ) {
	return /youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitter\.com|x\.com/i.test( url );
}

/**
 * Get embed provider name from URL.
 *
 * @param {string} url URL.
 * @return {string} Provider name.
 */
function getEmbedProvider( url ) {
	if ( /youtube\.com|youtu\.be/i.test( url ) ) {
		return 'youtube';
	}
	if ( /vimeo\.com/i.test( url ) ) {
		return 'vimeo';
	}
	if ( /dailymotion\.com/i.test( url ) ) {
		return 'dailymotion';
	}
	if ( /twitter\.com|x\.com/i.test( url ) ) {
		return 'twitter';
	}
	return 'embed';
}
