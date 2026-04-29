/**
 * HTML Parser Utilities
 *
 * Client-side parsing of HTML to extract metadata for Press This.
 *
 * @package
 */

/* global DOMParser */

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
		const key =
			tag.getAttribute( 'property' ) || tag.getAttribute( 'name' );
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
	const scripts = doc.querySelectorAll(
		'script[type="application/ld+json"]'
	);
	const result = {};

	scripts.forEach( ( script ) => {
		try {
			const data = JSON.parse( script.textContent );
			// Handle both single objects and arrays.
			const items = Array.isArray( data ) ? data : [ data ];

			items.forEach( ( item ) => {
				// Look for Article, NewsArticle, BlogPosting, WebPage types.
				if (
					item[ '@type' ] &&
					/Article|BlogPosting|WebPage|NewsArticle/i.test(
						item[ '@type' ]
					)
				) {
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
						} else if (
							Array.isArray( item.image ) &&
							item.image[ 0 ]
						) {
							result.image =
								typeof item.image[ 0 ] === 'string'
									? item.image[ 0 ]
									: item.image[ 0 ].url;
						}
					}
					if ( item.mainEntityOfPage ) {
						result.canonical =
							typeof item.mainEntityOfPage === 'string'
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
	let match = src.match(
		/(?:youtube\.com|youtube-nocookie\.com)\/embed\/([^?/]+)/
	);
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
				return text.length > 300
					? text.substring( 0, 297 ) + '...'
					: text;
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
	return linkCanonical?.getAttribute( 'href' ) || meta[ 'og:url' ] || '';
}

/**
 * Sanitize inline HTML, keeping only a safe allowlist of formatting elements.
 *
 * Allowlisted inline elements: strong, em, b, i, u, s, a (href only),
 * code, mark, sub, sup, span, br.
 * All other elements are unwrapped (their children are preserved).
 * Dangerous elements (script, style, object, embed, iframe) are fully removed.
 * All attributes are stripped except `href` on `<a>` elements.
 * URI schemes `javascript:`, `data:`, and `vbscript:` are blocked in `href`.
 *
 * @param {Element} element DOM element to sanitize (in-place).
 */
function sanitizeInlineContent( element ) {
	// Completely remove dangerous elements (do not preserve children).
	const dangerous = element.querySelectorAll(
		'script, style, object, embed, iframe'
	);
	dangerous.forEach( ( el ) => el.remove() );

	const ALLOWED_INLINE = new Set( [
		'strong',
		'em',
		'b',
		'i',
		'u',
		's',
		'a',
		'code',
		'mark',
		'sub',
		'sup',
		'span',
		'br',
	] );

	// Iterate over a static snapshot — we may mutate the DOM while iterating.
	Array.from( element.querySelectorAll( '*' ) ).forEach( ( el ) => {
		const tagName = el.tagName.toLowerCase();

		if ( ! ALLOWED_INLINE.has( tagName ) ) {
			// Unwrap: replace the element with its child nodes.
			el.replaceWith( ...el.childNodes );
			return;
		}

		// Strip all attributes except allowed ones per element.
		Array.from( el.attributes ).forEach( ( attr ) => {
			if ( tagName === 'a' && attr.name === 'href' ) {
				// Block dangerous URI schemes.
				if ( /^\s*(javascript|data|vbscript):/i.test( attr.value ) ) {
					el.removeAttribute( attr.name );
				}
			} else {
				el.removeAttribute( attr.name );
			}
		} );
	} );
}

/**
 * Convert a list element (ul/ol) to Gutenberg list block markup.
 *
 * @param {Element} listEl  The list element (ul or ol).
 * @param {boolean} ordered Whether this is an ordered list.
 * @param {number}  depth   Current recursion depth (default 0; max 10).
 * @return {string} Gutenberg list block markup.
 */
function listElementToBlock( listEl, ordered, depth = 0 ) {
	if ( depth > 10 ) {
		return '';
	}

	const tag = ordered ? 'ol' : 'ul';
	const attr = ordered ? ' {"ordered":true}' : '';
	let items = '';

	listEl.childNodes.forEach( ( child ) => {
		if (
			child.nodeType !== 1 /* ELEMENT_NODE */ ||
			child.tagName.toLowerCase() !== 'li'
		) {
			return;
		}

		// Clone to work with it non-destructively.
		const li = child.cloneNode( true );

		// Handle only direct-child nested lists within the li to avoid double-processing.
		let nestedBlocks = '';
		Array.from( li.children ).forEach( ( childEl ) => {
			const childTag = childEl.tagName.toLowerCase();
			if ( childTag === 'ul' || childTag === 'ol' ) {
				const isOrdered = childTag === 'ol';
				nestedBlocks +=
					'\n' + listElementToBlock( childEl, isOrdered, depth + 1 );
				childEl.remove();
			}
		} );

		sanitizeInlineContent( li );
		const liContent = li.innerHTML.trim();

		items += `<!-- wp:list-item -->\n<li>${ liContent }${ nestedBlocks }</li>\n<!-- /wp:list-item -->\n`;
	} );

	return `<!-- wp:list${ attr } -->\n<${ tag } class="wp-block-list">\n${ items }</${ tag }>\n<!-- /wp:list -->\n\n`;
}

/**
 * Convert an HTML string to Gutenberg block markup.
 *
 * Handles block-level elements: paragraphs, headings (h1-h6), unordered and
 * ordered lists with nesting, blockquotes, and preformatted/code blocks.
 * Inline elements are filtered through an allowlist (strong, em, b, i, u, s,
 * a[href], code, mark, sub, sup, span, br). All other attributes are stripped.
 *
 * Falls back to a paragraph block for unrecognised or purely inline content.
 *
 * @param {string} html  HTML string to convert.
 * @param {number} depth Internal recursion depth; callers should omit this.
 * @return {string} Gutenberg block markup string, or empty string if no content.
 */
export function htmlToBlocks( html, depth = 0 ) {
	if ( ! html || typeof html !== 'string' ) {
		return '';
	}

	// Guard against deeply nested blockquote structures.
	if ( depth > 5 ) {
		return `<!-- wp:paragraph -->\n<p>${ escapeHtml(
			html
		) }</p>\n<!-- /wp:paragraph -->\n`;
	}

	const parser = new DOMParser();
	const doc = parser.parseFromString( `<body>${ html }</body>`, 'text/html' );
	const body = doc.body;

	let blocks = '';
	let inlineBuffer = '';

	/**
	 * Flush any accumulated inline/text content as a paragraph block.
	 */
	function flushInlineBuffer() {
		const trimmed = inlineBuffer.trim();
		if ( trimmed ) {
			blocks += `<!-- wp:paragraph -->\n<p>${ trimmed }</p>\n<!-- /wp:paragraph -->\n\n`;
		}
		inlineBuffer = '';
	}

	/**
	 * Set of block-level tag names that start a new block.
	 */
	const BLOCK_TAGS = new Set( [
		'p',
		'ul',
		'ol',
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'blockquote',
		'pre',
		'figure',
		'div',
	] );

	body.childNodes.forEach( ( node ) => {
		if ( node.nodeType === 3 /* TEXT_NODE */ ) {
			const text = node.textContent;
			// Accumulate non-empty text into the inline buffer.
			if ( text.trim() ) {
				inlineBuffer += escapeHtml( text );
			}
			return;
		}

		if ( node.nodeType !== 1 /* ELEMENT_NODE */ ) {
			return;
		}

		const tag = node.tagName.toLowerCase();

		// Skip dangerous elements.
		if ( tag === 'script' || tag === 'style' ) {
			return;
		}

		if ( ! BLOCK_TAGS.has( tag ) ) {
			// Inline element – add to buffer.
			const clone = node.cloneNode( true );
			const tempEl = doc.createElement( 'div' );
			tempEl.appendChild( clone );
			sanitizeInlineContent( tempEl );
			inlineBuffer += tempEl.innerHTML;
			return;
		}

		// We're about to emit a block – flush any pending inline content first.
		flushInlineBuffer();

		// Headings.
		if ( /^h[1-6]$/.test( tag ) ) {
			const level = tag[ 1 ];
			const clone = node.cloneNode( true );
			const tempEl = doc.createElement( 'div' );
			tempEl.appendChild( clone );
			sanitizeInlineContent( tempEl );
			// After sanitization, block-level wrappers (h-tags) are unwrapped by
			// the allowlist; tempEl.innerHTML holds the sanitized inner content.
			blocks += `<!-- wp:heading {"level":${ level }} -->\n<${ tag } class="wp-block-heading">${ tempEl.innerHTML }</${ tag }>\n<!-- /wp:heading -->\n\n`;
			return;
		}

		// Lists.
		if ( tag === 'ul' || tag === 'ol' ) {
			blocks += listElementToBlock( node, tag === 'ol' );
			return;
		}

		// Blockquotes.
		if ( tag === 'blockquote' ) {
			const clone = node.cloneNode( true );
			const tempEl = doc.createElement( 'div' );
			tempEl.appendChild( clone );
			sanitizeInlineContent( tempEl );
			const inner = htmlToBlocks( tempEl.innerHTML, depth + 1 );
			const innerBlocks =
				inner ||
				`<!-- wp:paragraph -->\n<p>${ escapeHtml(
					node.textContent.trim()
				) }</p>\n<!-- /wp:paragraph -->\n`;
			blocks += `<!-- wp:quote -->\n<blockquote class="wp-block-quote">${ innerBlocks }</blockquote>\n<!-- /wp:quote -->\n\n`;
			return;
		}

		// Preformatted / code blocks.
		if ( tag === 'pre' ) {
			const codeEl = node.querySelector( 'code' );
			const codeContent = escapeHtml( ( codeEl || node ).textContent );
			blocks += `<!-- wp:code -->\n<pre class="wp-block-code"><code>${ codeContent }</code></pre>\n<!-- /wp:code -->\n\n`;
			return;
		}

		// Paragraphs and generic block elements (div, figure, etc.).
		const clone = node.cloneNode( true );
		const tempEl = doc.createElement( 'div' );
		tempEl.appendChild( clone );
		sanitizeInlineContent( tempEl );
		// tempEl.innerHTML holds the sanitized inner content after any outer
		// block-level wrapper has been unwrapped by the allowlist sanitizer.
		const innerHtml = tempEl.innerHTML.trim();
		if ( innerHtml ) {
			blocks += `<!-- wp:paragraph -->\n<p>${ innerHtml }</p>\n<!-- /wp:paragraph -->\n\n`;
		}
	} );

	// Flush any remaining inline content.
	flushInlineBuffer();

	return blocks.trim();
}

/**
 * Build suggested content from server-returned metadata.
 *
 * All dynamic content is escaped.
 * Uses pre-sanitized server data instead of client-side parsing.
 *
 * When `data.selectionHtml` is provided the selected HTML is converted to
 * formatted Gutenberg blocks via `htmlToBlocks`. If the conversion produces
 * no blocks (e.g. the selection contained only script tags), the function
 * falls back to `data.description` in a plain-text quote block.
 *
 * @param {Object} data               Server-returned metadata object.
 * @param {string} data.selectionHtml Optional HTML string of the user's selection.
 * @param {string} data.description   Optional plain-text description / meta excerpt.
 * @param {string} data.title         Optional page title.
 * @param {string} data.siteName      Optional site name.
 * @param {string} sourceUrl          Original source URL.
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
		// The figure class list must match what core/embed save() produces or
		// the block fails validation in the editor and the user sees
		// "Block contains unexpected or invalid content" instead of the
		// preview. core/embed save() emits the provider class twice — once as
		// `is-provider-X` and once as `wp-block-embed-X`.
		content += `<!-- wp:embed {"url":"${ escapedUrl }","type":"video","providerNameSlug":"${ provider }"} -->
<figure class="wp-block-embed is-type-video is-provider-${ provider } wp-block-embed-${ provider }"><div class="wp-block-embed__wrapper">
${ escapeHtml( sourceUrl ) }
</div></figure>
<!-- /wp:embed -->

`;
	}

	// Prefer formatted HTML selection; fall back to plain-text description.
	let selectionBlocks = '';
	if ( data.selectionHtml ) {
		selectionBlocks = htmlToBlocks( data.selectionHtml );
	}

	if ( selectionBlocks ) {
		// HTML selection converted successfully to blocks.
		content += selectionBlocks + '\n\n';
	} else if ( data.description ) {
		// No HTML selection (or it produced no blocks) – use plain-text quote.
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
<p>Source: <em><a href="${ escapeAttr( sourceUrl ) }">${ escapeHtml(
		linkText
	) }</a></em></p>
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
	return /youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitter\.com|x\.com/i.test(
		url
	);
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
