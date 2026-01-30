( function( window, document, href, pt_url ) {
	/**
	 * Press This Bookmarklet
	 *
	 * Extracts content from the current page and sends it to Press This.
	 * Uses GET request + postMessage to work around SameSite cookie restrictions.
	 *
	 * Flow:
	 * 1. Open Press This via GET (sends session cookies)
	 * 2. Send scraped data via postMessage (after popup loads)
	 *
	 * @version 11
	 */
	var PT_VERSION = 11,
		encURI = window.encodeURIComponent,
		head = document.getElementsByTagName( 'head' )[0],
		target = '_press_this_app',
		windowWidth, windowHeight, selection,
		metas, links, content, images, iframes, img, scripts,
		scrapedData = {},
		popup;

	if ( ! pt_url ) {
		return;
	}

	if ( href.match( /^https?:/ ) ) {
		pt_url += '&u=' + encURI( href );
	} else {
		top.location.href = pt_url;
		return;
	}

	if ( window.getSelection ) {
		selection = window.getSelection() + '';
	} else if ( document.getSelection ) {
		selection = document.getSelection() + '';
	} else if ( document.selection ) {
		selection = document.selection.createRange().text || '';
	}

	pt_url += '&buster=' + ( new Date().getTime() );

	// Add postMessage mode flag - tells Press This to expect data via postMessage.
	pt_url += '&pm=1';

	windowWidth  = window.outerWidth || document.documentElement.clientWidth || 600;
	windowHeight = window.outerHeight || document.documentElement.clientHeight || 700;

	windowWidth = ( windowWidth < 800 || windowWidth > 5000 ) ? 600 : ( windowWidth * 0.7 );
	windowHeight = ( windowHeight < 800 || windowHeight > 3000 ) ? 700 : ( windowHeight * 0.9 );

	/**
	 * Add data to the scraped data object.
	 *
	 * @param {string} name  Data key name.
	 * @param {string} value Data value.
	 */
	function add( name, value ) {
		if ( typeof value === 'undefined' || value === null || value === '' ) {
			return;
		}

		// Handle array notation (e.g., '_images[]', '_embeds[]').
		var arrayMatch = name.match( /^(.+)\[\]$/ );
		if ( arrayMatch ) {
			var arrayName = arrayMatch[1];
			if ( ! scrapedData[ arrayName ] ) {
				scrapedData[ arrayName ] = [];
			}
			scrapedData[ arrayName ].push( value );
			return;
		}

		// Handle nested notation (e.g., '_meta[og:title]', '_links[canonical]').
		var nestedMatch = name.match( /^(.+)\[(.+)\]$/ );
		if ( nestedMatch ) {
			var parentKey = nestedMatch[1];
			var childKey = nestedMatch[2];
			if ( ! scrapedData[ parentKey ] ) {
				scrapedData[ parentKey ] = {};
			}
			scrapedData[ parentKey ][ childKey ] = value;
			return;
		}

		// Simple key-value.
		scrapedData[ name ] = value;
	}

	/**
	 * Extract JSON-LD structured data from the page.
	 * Looks for schema.org VideoObject, Article, or other relevant types.
	 */
	function extractJsonLd() {
		scripts = document.querySelectorAll( 'script[type="application/ld+json"]' );

		for ( var i = 0; i < scripts.length && i < 10; i++ ) {
			try {
				var jsonData = JSON.parse( scripts[ i ].textContent );

				// Handle @graph arrays (common in WordPress SEO plugins).
				if ( jsonData['@graph'] && Array.isArray( jsonData['@graph'] ) ) {
					jsonData['@graph'].forEach( processJsonLdItem );
				} else {
					processJsonLdItem( jsonData );
				}
			} catch ( e ) {
				// Invalid JSON, skip this script tag.
			}
		}
	}

	/**
	 * Process a single JSON-LD item.
	 *
	 * @param {Object} item JSON-LD object.
	 */
	function processJsonLdItem( item ) {
		if ( ! item || typeof item !== 'object' ) {
			return;
		}

		var itemType = item['@type'];

		// Extract video embed URLs from VideoObject.
		if ( itemType === 'VideoObject' ) {
			if ( item.embedUrl ) {
				add( '_embeds[]', item.embedUrl );
			}
			if ( item.contentUrl && ! item.embedUrl ) {
				add( '_embeds[]', item.contentUrl );
			}
		}

		// Extract canonical URL from Article or WebPage.
		if ( ( itemType === 'Article' || itemType === 'WebPage' || itemType === 'NewsArticle' || itemType === 'BlogPosting' ) ) {
			if ( item.mainEntityOfPage && typeof item.mainEntityOfPage === 'string' ) {
				add( '_jsonld[canonical]', item.mainEntityOfPage );
			} else if ( item.mainEntityOfPage && item.mainEntityOfPage['@id'] ) {
				add( '_jsonld[canonical]', item.mainEntityOfPage['@id'] );
			}
			if ( item.headline ) {
				add( '_jsonld[headline]', item.headline );
			}
			if ( item.description ) {
				add( '_jsonld[description]', item.description );
			}
		}

		// Extract image from structured data.
		if ( item.image ) {
			var imgUrl = '';
			if ( typeof item.image === 'string' ) {
				imgUrl = item.image;
			} else if ( item.image.url ) {
				imgUrl = item.image.url;
			} else if ( Array.isArray( item.image ) && item.image[0] ) {
				imgUrl = typeof item.image[0] === 'string' ? item.image[0] : item.image[0].url;
			}
			if ( imgUrl ) {
				add( '_jsonld[image]', imgUrl );
			}
		}
	}

	// Add bookmarklet version for upgrade detection.
	add( 'pt_version', PT_VERSION );

	// Extract meta tags.
	metas = head.getElementsByTagName( 'meta' ) || [];

	for ( var m = 0; m < metas.length; m++ ) {
		if ( m > 200 ) {
			break;
		}

		var q = metas[ m ],
			q_name = q.getAttribute( 'name' ),
			q_prop = q.getAttribute( 'property' ),
			q_cont = q.getAttribute( 'content' );

		if ( q_cont ) {
			if ( q_name ) {
				add( '_meta[' + q_name + ']', q_cont );
			} else if ( q_prop ) {
				add( '_meta[' + q_prop + ']', q_cont );

				// Enhanced: Extract Open Graph video metadata for embeds.
				if ( q_prop === 'og:video' || q_prop === 'og:video:url' || q_prop === 'og:video:secure_url' ) {
					add( '_og_video[]', q_cont );
				}
			}
		}
	}

	// Extract link tags (canonical, shortlink, icon).
	links = head.getElementsByTagName( 'link' ) || [];

	for ( var y = 0; y < links.length; y++ ) {
		if ( y >= 50 ) {
			break;
		}

		var g = links[ y ],
			g_rel = g.getAttribute( 'rel' );

		if ( g_rel === 'canonical' || g_rel === 'icon' || g_rel === 'shortlink' ) {
			add( '_links[' + g_rel + ']', g.getAttribute( 'href' ) );
		}

		// Enhanced: Also check for alternate links that might provide canonical.
		if ( g_rel === 'alternate' ) {
			var hreflang = g.getAttribute( 'hreflang' );
			if ( hreflang === 'x-default' ) {
				add( '_links[alternate_canonical]', g.getAttribute( 'href' ) );
			}
		}
	}

	// Extract JSON-LD structured data.
	extractJsonLd();

	// Find main content area.
	if ( document.body.getElementsByClassName ) {
		content = document.body.getElementsByClassName( 'hfeed' )[0];
	}

	content = document.getElementById( 'content' ) || content || document.body;
	images = content.getElementsByTagName( 'img' ) || [];

	// Extract images, filtering out small/irrelevant ones.
	for ( var n = 0; n < images.length; n++ ) {
		if ( n >= 100 ) {
			break;
		}

		img = images[ n ];

		// Skip images that are too small or are avatars.
		// Width threshold: 256px, Height threshold: 128px.
		if ( img.src.indexOf( 'avatar' ) > -1 || img.className.indexOf( 'avatar' ) > -1 ||
			( img.width && img.width < 256 ) || ( img.height && img.height < 128 ) ) {

			continue;
		}

		// Skip data URIs and empty sources.
		if ( ! img.src || img.src.indexOf( 'data:' ) === 0 ) {
			continue;
		}

		add( '_images[]', img.src );
	}

	// Extract iframes (potential embeds).
	iframes = document.body.getElementsByTagName( 'iframe' ) || [];

	for ( var p = 0; p < iframes.length; p++ ) {
		if ( p >= 50 ) {
			break;
		}

		var iframeSrc = iframes[ p ].src;

		// Skip empty or about:blank iframes.
		if ( ! iframeSrc || iframeSrc === 'about:blank' ) {
			continue;
		}

		// Skip obvious non-embeddable iframes (comments, analytics, ads, widgets).
		if ( iframeSrc.indexOf( 'jetpack-comment' ) > -1 ||
			iframeSrc.indexOf( 'disqus.com' ) > -1 ||
			iframeSrc.indexOf( 'facebook.com/plugins' ) > -1 ||
			iframeSrc.indexOf( 'platform.twitter.com/widgets' ) > -1 ||
			iframeSrc.indexOf( 'google.com/recaptcha' ) > -1 ||
			iframeSrc.indexOf( 'googletagmanager.com' ) > -1 ||
			iframeSrc.indexOf( 'doubleclick.net' ) > -1 ||
			iframeSrc.indexOf( 'googlesyndication.com' ) > -1 ||
			iframeSrc.indexOf( 'amazon-adsystem.com' ) > -1 ||
			iframeSrc.indexOf( 'quantserve.com' ) > -1 ||
			iframeSrc.indexOf( 'scorecardresearch.com' ) > -1 ||
			iframeSrc.indexOf( 'addthis.com' ) > -1 ||
			iframeSrc.indexOf( 'sharethis.com' ) > -1 ||
			iframeSrc.indexOf( 'addtoany.com' ) > -1 ) {
			continue;
		}

		add( '_embeds[]', iframeSrc );
	}

	// Add page title.
	if ( document.title ) {
		add( 't', document.title );
	}

	// Add text selection.
	if ( selection ) {
		add( 's', selection );
	}

	/**
	 * Send scraped data to the Press This popup via postMessage.
	 * Uses polling to wait for the popup to be ready.
	 */
	function sendDataToPopup() {
		var attempts = 0;
		var maxAttempts = 50; // 5 seconds max wait (50 * 100ms).
		var targetOrigin = pt_url.match( /^https?:\/\/[^\/]+/ )[0];

		function trySend() {
			attempts++;

			if ( ! popup || popup.closed ) {
				// Popup was closed, stop trying.
				return;
			}

			try {
				// Send the data with a special type identifier.
				popup.postMessage( {
					type: 'press-this-data',
					version: PT_VERSION,
					data: scrapedData
				}, targetOrigin );
			} catch ( e ) {
				// Cross-origin access error, keep trying.
			}

			// Keep sending for a bit to ensure it's received.
			if ( attempts < maxAttempts ) {
				setTimeout( trySend, 100 );
			}
		}

		// Start sending after a short delay to allow popup to load.
		setTimeout( trySend, 200 );
	}

	// Open popup window directly (GET request sends session cookies).
	popup = window.open( pt_url, target, 'location,resizable,scrollbars,width=' + windowWidth + ',height=' + windowHeight );

	// Send scraped data via postMessage.
	sendDataToPopup();
} )( window, document, top.location.href, window.pt_url );
