/**
 * Featured Image Panel Component
 *
 * Sidebar panel for selecting/uploading a featured image.
 * Uses WordPress Media Library for image selection.
 * Supports setting scraped images as featured image.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { useState, useCallback, useEffect, useMemo } from '@wordpress/element';
import { Button, Spinner, PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Filter images by loading them and checking dimensions.
 *
 * @param {string[]} images     Array of image URLs.
 * @param {Function} onFiltered Callback with filtered images.
 */
function filterValidImages( images, onFiltered ) {
	const validImages = [];
	let pending = images.length;

	if ( pending === 0 ) {
		onFiltered( [] );
		return;
	}

	images.forEach( ( src ) => {
		const img = new Image();

		img.onload = () => {
			// Only include images that are reasonably sized.
			if ( img.width >= 100 && img.height >= 100 ) {
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
 * Sideload an external image and return attachment data.
 *
 * @param {string} url       Image URL to sideload.
 * @param {Object} restConfig REST API configuration.
 * @param {number} postId    Post ID to attach image to.
 * @return {Promise<Object>} Attachment data with id and url.
 */
async function sideloadImage( url, restConfig, postId = 0 ) {
	const response = await fetch( `${ restConfig.restUrl }sideload`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-WP-Nonce': restConfig.restNonce,
		},
		body: JSON.stringify( {
			url,
			post_id: postId,
		} ),
	} );

	const result = await response.json();

	if ( ! response.ok || ! result.success ) {
		throw new Error( result.message || 'Failed to sideload image' );
	}

	return result;
}

/**
 * Open WordPress media library.
 *
 * @param {Function} onSelect Callback when media is selected.
 */
function openMediaLibrary( onSelect ) {
	// Use the WordPress media library directly.
	const frame = window.wp.media( {
		title: __( 'Select Featured Image', 'press-this' ),
		button: {
			text: __( 'Set featured image', 'press-this' ),
		},
		multiple: false,
		library: {
			type: 'image',
		},
	} );

	frame.on( 'select', () => {
		const attachment = frame.state().get( 'selection' ).first().toJSON();
		onSelect( attachment );
	} );

	frame.open();
}

/**
 * Featured Image Panel component.
 *
 * @param {Object}   props                  Component props.
 * @param {number}   props.featuredImageId  Current featured image ID.
 * @param {Function} props.onSelect         Callback when image is selected.
 * @param {Function} props.onRemove         Callback when image is removed.
 * @param {boolean}  props.canUpload        Whether user can upload files.
 * @param {Array}    props.scrapedImages    Array of scraped image URLs.
 * @param {Object}   props.restConfig       REST API configuration.
 * @param {number}   props.postId           Current post ID.
 * @return {JSX.Element} Panel component.
 */
export default function FeaturedImagePanel( {
	featuredImageId = 0,
	onSelect,
	onRemove,
	canUpload = true,
	scrapedImages = [],
	restConfig = {},
	postId = 0,
} ) {
	const [ imageData, setImageData ] = useState( null );
	const [ isSideloading, setIsSideloading ] = useState( false );
	const [ sideloadError, setSideloadError ] = useState( null );
	const [ validScrapedImages, setValidScrapedImages ] = useState( [] );
	const [ isFilteringImages, setIsFilteringImages ] = useState( false );

	// Filter scraped images to only show valid ones.
	useEffect( () => {
		if ( scrapedImages.length > 0 ) {
			setIsFilteringImages( true );
			// Only check the first 12 images to avoid too many requests.
			filterValidImages( scrapedImages.slice( 0, 12 ), ( valid ) => {
				setValidScrapedImages( valid );
				setIsFilteringImages( false );
			} );
		} else {
			setValidScrapedImages( [] );
			setIsFilteringImages( false );
		}
	}, [ scrapedImages ] );

	/**
	 * Handle media selection from library.
	 *
	 * @param {Object} media Selected media object.
	 */
	const handleSelect = useCallback( ( media ) => {
		if ( media && media.id ) {
			setImageData( {
				id: media.id,
				url: media.url || media.sizes?.medium?.url || media.sizes?.full?.url,
				alt: media.alt || '',
			} );
			onSelect( media.id );
		}
	}, [ onSelect ] );

	/**
	 * Handle image removal.
	 */
	const handleRemove = useCallback( () => {
		setImageData( null );
		onRemove();
	}, [ onRemove ] );

	/**
	 * Open media library for selection.
	 */
	const handleOpenMedia = useCallback( () => {
		openMediaLibrary( handleSelect );
	}, [ handleSelect ] );

	/**
	 * Handle selection of a scraped image as featured image.
	 *
	 * @param {string} url Scraped image URL.
	 */
	const handleScrapedImageSelect = useCallback( async ( url ) => {
		if ( ! restConfig.restUrl || ! restConfig.restNonce ) {
			setSideloadError( __( 'REST API configuration missing.', 'press-this' ) );
			return;
		}

		setIsSideloading( true );
		setSideloadError( null );

		try {
			const result = await sideloadImage( url, restConfig, postId );
			setImageData( {
				id: result.id,
				url: result.url,
				alt: '',
			} );
			onSelect( result.id );
		} catch ( error ) {
			setSideloadError( error.message || __( 'Failed to set featured image.', 'press-this' ) );
		} finally {
			setIsSideloading( false );
		}
	}, [ restConfig, postId, onSelect ] );

	return (
		<PanelBody
			title={ __( 'Featured Image', 'press-this' ) }
			initialOpen={ false }
		>
			<div className="press-this-featured-image">
				{ imageData && imageData.url ? (
					<div className="press-this-featured-image__preview">
						<img
							src={ imageData.url }
							alt={ imageData.alt || __( 'Featured image', 'press-this' ) }
							className="press-this-featured-image__image"
						/>
						<div className="press-this-featured-image__actions">
							<Button
								variant="secondary"
								onClick={ handleOpenMedia }
								className="press-this-featured-image__replace"
							>
								{ __( 'Replace', 'press-this' ) }
							</Button>
							<Button
								variant="link"
								isDestructive
								onClick={ handleRemove }
								className="press-this-featured-image__remove"
							>
								{ __( 'Remove', 'press-this' ) }
							</Button>
						</div>
					</div>
				) : (
					<Button
						variant="secondary"
						onClick={ handleOpenMedia }
						className="press-this-featured-image__set"
					>
						{ __( 'Set featured image', 'press-this' ) }
					</Button>
				) }

				{ /* Scraped Images Section */ }
				{ ( validScrapedImages.length > 0 || isFilteringImages ) && ! imageData && (
					<div className="press-this-featured-image__scraped">
						<h4 className="press-this-featured-image__scraped-title">
							{ __( 'From Source', 'press-this' ) }
						</h4>
						{ ( isSideloading || isFilteringImages ) && (
							<div className="press-this-featured-image__loading">
								<Spinner />
								<span>{ isSideloading ? __( 'Uploading...', 'press-this' ) : __( 'Loading...', 'press-this' ) }</span>
							</div>
						) }
						{ sideloadError && (
							<p className="press-this-featured-image__error">
								{ sideloadError }
							</p>
						) }
						{ ! isSideloading && ! isFilteringImages && validScrapedImages.length > 0 && (
							<div className="press-this-featured-image__scraped-grid">
								{ validScrapedImages.slice( 0, 6 ).map( ( src, index ) => (
									<button
										key={ index }
										type="button"
										className="press-this-featured-image__scraped-item"
										onClick={ () => handleScrapedImageSelect( src ) }
										title={ __( 'Set as featured image', 'press-this' ) }
									>
										<img
											src={ src }
											alt=""
											loading="lazy"
										/>
									</button>
								) ) }
							</div>
						) }
					</div>
				) }
			</div>
		</PanelBody>
	);
}
