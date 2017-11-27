( function( window, document, href, pt_url ) {
	var encURI = window.encodeURIComponent,
	selection;
	if ( ! pt_url ) {
		return;
	}

	if ( /^https?:/.test( href ) ) {
		pt_url += '&u=' + encURI( href );
	}

	if ( window.getSelection ) {
		selection = window.getSelection() + '';
	} else if ( document.getSelection ) {
		selection = document.getSelection() + '';
	} else if ( document.selection ) {
		selection = document.selection.createRange().text || '';
	}

	if ( document.title ) {
		pt_url += '&t=' + encURI( document.title.substr( 0, 256 ) );
	}

	if ( selection ) {
		pt_url += '&s=' + encURI( selection.substr( 0, 512 ) );
	}

	top.location.href = pt_url + '&' + ( new Date().getTime() );
} )( window, document, top.location.href, url );