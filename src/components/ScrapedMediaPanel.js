/**
 * Scraped Media Panel Component
 *
 * Sidebar panel displaying images and embeds scraped from the source URL.
 * Allows inserting media as blocks into the editor.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { useState, useCallback, useEffect, useMemo } from '@wordpress/element';
import { Button, Spinner } from '@wordpress/components';
import { createBlock } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

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
		return trimmed.replace( /["\\<>]/g, '' );
	}

	return '';
}

/**
 * Filter images by minimum dimensions.
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
			// Skip images that are too small.
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
 * Extract domain from URL for embed display.
 *
 * @param {string} url URL to extract domain from.
 * @return {string} Domain name.
 */
function getDomain( url ) {
	try {
		const parsed = new URL( url );
		return parsed.hostname.replace( /^www\./, '' );
	} catch {
		return url;
	}
}

/**
 * Scraped Media Panel component.
 *
 * @param {Object}   props               Component props.
 * @param {string[]} props.images        Array of image URLs.
 * @param {string[]} props.embeds        Array of embed URLs.
 * @param {Function} props.onInsertBlock Callback to insert block into editor.
 * @param {string}   props.sourceUrl     The source URL being clipped.
 * @return {JSX.Element|null} Panel component or null if no media.
 */
export default function ScrapedMediaPanel( {
	images = [],
	embeds = [],
	onInsertBlock,
	sourceUrl = '',
} ) {
	const [ filteredImages, setFilteredImages ] = useState( [] );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ isExpanded, setIsExpanded ] = useState( true );

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
		if ( sanitizedImages.length > 0 ) {
			setIsLoading( true );
			filterImagesByDimensions( sanitizedImages, ( valid ) => {
				setFilteredImages( valid );
				setIsLoading( false );
			} );
		} else {
			setFilteredImages( [] );
			setIsLoading( false );
		}
	}, [ sanitizedImages ] );

	/**
	 * Insert image block.
	 *
	 * @param {string} src Image URL.
	 */
	const handleInsertImage = useCallback( ( src ) => {
		const block = createBlock( 'core/image', {
			url: src,
			alt: '',
		} );
		onInsertBlock( block );
	}, [ onInsertBlock ] );

	/**
	 * Insert embed block.
	 *
	 * @param {string} url Embed URL.
	 */
	const handleInsertEmbed = useCallback( ( url ) => {
		const block = createBlock( 'core/embed', {
			url,
		} );
		onInsertBlock( block );
	}, [ onInsertBlock ] );

	// Check if we have any media to display.
	const hasMedia = filteredImages.length > 0 || sanitizedEmbeds.length > 0;

	// Don't render if no media and not loading.
	if ( ! hasMedia && ! isLoading ) {
		return null;
	}

	return (
		<div className="press-this-editor__panel press-this-scraped-media">
			<button
				type="button"
				className="press-this-scraped-media__header"
				onClick={ () => setIsExpanded( ! isExpanded ) }
				aria-expanded={ isExpanded }
			>
				<h3>{ __( 'Scraped Media', 'press-this' ) }</h3>
				<span
					className={ `dashicons dashicons-arrow-${ isExpanded ? 'up' : 'down' }-alt2` }
					aria-hidden="true"
				/>
			</button>

			{ isExpanded && (
				<div className="press-this-scraped-media__content">
					{ sourceUrl && (
						<p className="press-this-scraped-media__source">
							{ __( 'From:', 'press-this' ) }{ ' ' }
							<a href={ sourceUrl } target="_blank" rel="noopener noreferrer">
								{ getDomain( sourceUrl ) }
							</a>
						</p>
					) }

					{ isLoading && (
						<div className="press-this-scraped-media__loading">
							<Spinner />
							<span>{ __( 'Loading images...', 'press-this' ) }</span>
						</div>
					) }

					{ /* Embeds section */ }
					{ sanitizedEmbeds.length > 0 && (
						<div className="press-this-scraped-media__section">
							<h4>{ __( 'Embeds', 'press-this' ) }</h4>
							<ul className="press-this-scraped-media__embeds">
								{ sanitizedEmbeds.map( ( url, index ) => (
									<li key={ index }>
										<Button
											variant="secondary"
											onClick={ () => handleInsertEmbed( url ) }
											className="press-this-scraped-media__embed-button"
										>
											<span className="dashicons dashicons-embed-video" aria-hidden="true" />
											<span className="press-this-scraped-media__embed-domain">
												{ getDomain( url ) }
											</span>
										</Button>
									</li>
								) ) }
							</ul>
						</div>
					) }

					{ /* Images section */ }
					{ filteredImages.length > 0 && (
						<div className="press-this-scraped-media__section">
							<h4>{ __( 'Images', 'press-this' ) }</h4>
							<div className="press-this-scraped-media__images">
								{ filteredImages.map( ( src, index ) => (
									<button
										key={ index }
										type="button"
										className="press-this-scraped-media__image-button"
										onClick={ () => handleInsertImage( src ) }
										title={ __( 'Click to insert', 'press-this' ) }
									>
										<img
											src={ src }
											alt={ __( 'Scraped image', 'press-this' ) }
											loading="lazy"
										/>
									</button>
								) ) }
							</div>
						</div>
					) }

					{ ! isLoading && ! hasMedia && (
						<p className="press-this-scraped-media__empty">
							{ __( 'No media found on this page.', 'press-this' ) }
						</p>
					) }
				</div>
			) }
		</div>
	);
}
