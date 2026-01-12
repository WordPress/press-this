/**
 * MediaGrid Component
 *
 * Displays a grid of scraped media items (images and embeds).
 * Supports inserting media into the editor and setting featured images.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { useState, useCallback, useEffect, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import MediaThumbnail from './MediaThumbnail';

/**
 * Validate and sanitize URL.
 *
 * @param {string} url URL to validate.
 * @return {string} Sanitized URL or empty string.
 */
function sanitizeUrl( url ) {
	if ( ! url || typeof url !== 'string' ) {
		return '';
	}

	const trimmed = url.trim();

	// Only allow HTTP(S) and protocol-relative URLs.
	if ( /^(?:https?:)?\/\//i.test( trimmed ) ) {
		// Remove any dangerous characters.
		return trimmed.replace( /["\\<>]/g, '' );
	}

	return '';
}

/**
 * Filter out invalid images by loading them.
 *
 * @param {string[]} images     Array of image URLs.
 * @param {Function} onFiltered Callback with filtered images.
 */
function filterImagesByDimensions( images, onFiltered ) {
	const validImages = [];
	let pending = images.length;

	if ( pending === 0 ) {
		onFiltered( [] );
		return;
	}

	images.forEach( ( src ) => {
		const img = new Image();

		img.onload = () => {
			// Skip images that are too small (likely icons, avatars, etc.).
			if ( img.width >= 256 && img.height >= 128 ) {
				validImages.push( src );
			}
			pending--;
			if ( pending === 0 ) {
				onFiltered( validImages );
			}
		};

		img.onerror = () => {
			pending--;
			if ( pending === 0 ) {
				onFiltered( validImages );
			}
		};

		img.src = src;
	} );
}

/**
 * MediaGrid component.
 *
 * @param {Object}   props                    Component props.
 * @param {string[]} props.images             Array of image URLs.
 * @param {string[]} props.embeds             Array of embed URLs.
 * @param {string}   props.featuredImage      Currently selected featured image URL.
 * @param {Function} props.onInsert           Callback when inserting media into editor.
 * @param {Function} props.onSetFeatured      Callback when setting featured image.
 * @param {boolean}  props.filterByDimensions Whether to filter images by dimensions.
 * @param {string}   props.className          Additional CSS class.
 * @return {JSX.Element|null} The MediaGrid component or null if no media.
 */
export default function MediaGrid( {
	images = [],
	embeds = [],
	featuredImage = '',
	onInsert,
	onSetFeatured,
	filterByDimensions = true,
	className = '',
} ) {
	const [ filteredImages, setFilteredImages ] = useState( [] );
	const [ isFiltering, setIsFiltering ] = useState( filterByDimensions );

	// Sanitize and deduplicate URLs.
	const sanitizedImages = useMemo( () => {
		const seen = new Set();
		return images.map( sanitizeUrl ).filter( ( url ) => {
			if ( ! url || seen.has( url ) ) {
				return false;
			}
			seen.add( url );
			return true;
		} );
	}, [ images ] );

	const sanitizedEmbeds = useMemo( () => {
		const seen = new Set();
		return embeds.map( sanitizeUrl ).filter( ( url ) => {
			if ( ! url || seen.has( url ) ) {
				return false;
			}
			seen.add( url );
			return true;
		} );
	}, [ embeds ] );

	// Filter images by dimensions.
	useEffect( () => {
		if ( filterByDimensions && sanitizedImages.length > 0 ) {
			setIsFiltering( true );
			filterImagesByDimensions( sanitizedImages, ( valid ) => {
				setFilteredImages( valid );
				setIsFiltering( false );
			} );
		} else {
			setFilteredImages( sanitizedImages );
			setIsFiltering( false );
		}
	}, [ sanitizedImages, filterByDimensions ] );

	// Get images to display.
	const displayImages = filterByDimensions ? filteredImages : sanitizedImages;

	/**
	 * Handle insert media.
	 */
	const handleInsert = useCallback(
		( mediaData ) => {
			if ( onInsert ) {
				onInsert( mediaData );
			}
		},
		[ onInsert ]
	);

	/**
	 * Handle set featured image.
	 */
	const handleSetFeatured = useCallback(
		( src ) => {
			if ( onSetFeatured ) {
				// Toggle off if already featured.
				const newFeatured = featuredImage === src ? '' : src;
				onSetFeatured( newFeatured );
			}
		},
		[ onSetFeatured, featuredImage ]
	);

	// Don't render if no media and not filtering.
	const hasMedia = sanitizedEmbeds.length > 0 || displayImages.length > 0;
	if ( ! hasMedia && ! isFiltering ) {
		return null;
	}

	const gridClassNames = [
		'press-this-media-grid',
		hasMedia && 'has-media',
		isFiltering && 'is-loading',
		className,
	]
		.filter( Boolean )
		.join( ' ' );

	return (
		<div className="press-this-media-grid-container">
			{ hasMedia && (
				<h2 className="press-this-media-grid__title screen-reader-text">
					{ __( 'Available Media', 'press-this' ) }
				</h2>
			) }

			<ul
				className={ gridClassNames }
				role="listbox"
				aria-label={ __( 'Scraped media from page', 'press-this' ) }
			>
				{ /* Render embeds first */ }
				{ sanitizedEmbeds.map( ( src, index ) => (
					<li key={ `embed-${ index }` } role="option">
						<MediaThumbnail
							src={ src }
							isEmbed={ true }
							isFeatured={ false }
							onInsert={ handleInsert }
							index={ index }
						/>
					</li>
				) ) }

				{ /* Render images */ }
				{ displayImages.map( ( src, index ) => (
					<li key={ `image-${ index }` } role="option">
						<MediaThumbnail
							src={ src }
							isEmbed={ false }
							isFeatured={ featuredImage === src }
							onInsert={ handleInsert }
							onSetFeatured={ handleSetFeatured }
							index={ sanitizedEmbeds.length + index }
						/>
					</li>
				) ) }
			</ul>

			{ isFiltering && (
				<p className="press-this-media-grid__loading">
					{ __( 'Loading images…', 'press-this' ) }
				</p>
			) }
		</div>
	);
}
