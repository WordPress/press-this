( function( window, document, href, pt_url ) {
	/**
	 * Press This Bookmarklet
	 *
	 * Extracts content from the current page and submits it to Press This.
	 * Supports both POST (preferred) and GET (fallback) submission methods.
	 *
	 * @version 10
	 */
	var PT_VERSION = 10,
		encURI = window.encodeURIComponent,
		form = document.createElement( 'form' ),
		head = document.getElementsByTagName( 'head' )[0],
		target = '_press_this_app',
		canPost = true,
		windowWidth, windowHeight, selection,
		metas, links, content, images, iframes, img, scripts;

	if ( ! pt_url ) {
		return;
	}

	if ( href.match( /^https?:/ ) ) {
		pt_url += '&u=' + encURI( href );
		if ( href.match( /^https:/ ) && pt_url.match( /^http:/ ) ) {
			canPost = false;
		}
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

	if ( ! canPost ) {
		if ( document.title ) {
			pt_url += '&t=' + encURI( document.title.substr( 0, 256 ) );
		}

		if ( selection ) {
			pt_url += '&s=' + encURI( selection.substr( 0, 512 ) );
		}
	}

	windowWidth  = window.outerWidth || document.documentElement.clientWidth || 600;
	windowHeight = window.outerHeight || document.documentElement.clientHeight || 700;

	windowWidth = ( windowWidth < 800 || windowWidth > 5000 ) ? 600 : ( windowWidth * 0.7 );
	windowHeight = ( windowHeight < 800 || windowHeight > 3000 ) ? 700 : ( windowHeight * 0.9 );

	if ( ! canPost ) {
		window.open( pt_url, target, 'location,resizable,scrollbars,width=' + windowWidth + ',height=' + windowHeight );
		return;
	}

	/**
	 * Add a hidden input field to the form.
	 *
	 * @param {string} name  Input name.
	 * @param {string} value Input value.
	 */
	function add( name, value ) {
		if ( typeof value === 'undefined' || value === null || value === '' ) {
			return;
		}

		var input = document.createElement( 'input' );

		input.name = name;
		input.value = value;
		input.type = 'hidden';

		form.appendChild( input );
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

	// Set up form for POST submission.
	form.setAttribute( 'method', 'POST' );
	form.setAttribute( 'action', pt_url );
	form.setAttribute( 'target', target );
	form.setAttribute( 'style', 'display: none;' );

	// Open popup window and submit form.
	window.open( 'about:blank', target, 'location,resizable,scrollbars,width=' + windowWidth + ',height=' + windowHeight );

	document.body.appendChild( form );
	form.submit();
} )( window, document, top.location.href, window.pt_url );
