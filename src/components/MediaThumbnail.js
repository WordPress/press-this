/**
 * MediaThumbnail Component
 *
 * A thumbnail component for displaying scraped media items.
 * Supports click-to-insert and set-as-featured-image actions.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { useState, useCallback, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Media type dashicon classes.
 */
const MEDIA_ICONS = {
	image: 'dashicons-format-image',
	video: 'dashicons-video-alt3',
	audio: 'dashicons-format-audio',
	embed: 'dashicons-video-alt3',
	tweet: 'dashicons-twitter', // Twitter icon for tweets.
};

/**
 * Get display URL for thumbnail based on source URL.
 *
 * @param {string} src        Source URL.
 * @param {string} type       Media type.
 * @param {number} smallWidth Desired thumbnail width.
 * @return {string} Display URL.
 */
function getDisplayUrl( src, type, smallWidth = 128 ) {
	if ( type !== 'image' ) {
		// Try to get YouTube thumbnail.
		if ( src.includes( 'youtube.com/' ) ) {
			const match = src.match( /[?&]v=([^&]+)/ );
			if ( match ) {
				return `https://i.ytimg.com/vi/${ match[ 1 ] }/hqdefault.jpg`;
			}
		}
		if ( src.includes( 'youtu.be/' ) ) {
			const match = src.match( /youtu\.be\/([^/?]+)/ );
			if ( match ) {
				return `https://i.ytimg.com/vi/${ match[ 1 ] }/hqdefault.jpg`;
			}
		}
		// Dailymotion thumbnail.
		if ( src.includes( 'dailymotion.com' ) ) {
			return src.replace( '/video/', '/thumbnail/video/' );
		}
		return '';
	}

	// Handle WordPress.com and Gravatar URLs.
	let displaySrc = src.replace( /^(http[^?]+)(\?.*)?$/, '$1' );

	if ( src.includes( 'files.wordpress.com/' ) ) {
		displaySrc = displaySrc.replace( /\?.*$/, '' ) + '?w=' + smallWidth;
	} else if ( src.includes( 'gravatar.com/' ) ) {
		displaySrc = displaySrc.replace( /\?.*$/, '' ) + '?s=' + smallWidth;
	}

	return displaySrc;
}

/**
 * Determine media type from URL.
 *
 * @param {string}  src     Source URL.
 * @param {boolean} isEmbed Whether this is an embed.
 * @return {string} Media type.
 */
function getMediaType( src, isEmbed ) {
	if ( ! isEmbed ) {
		return 'image';
	}

	const lowerSrc = src.toLowerCase();

	if (
		lowerSrc.includes( 'youtube.com' ) ||
		lowerSrc.includes( 'youtu.be' ) ||
		lowerSrc.includes( 'vimeo.com' ) ||
		lowerSrc.includes( 'dailymotion.com' )
	) {
		return 'video';
	}

	if (
		lowerSrc.includes( 'soundcloud.com' ) ||
		lowerSrc.includes( 'spotify.com' )
	) {
		return 'audio';
	}

	if ( lowerSrc.includes( 'twitter.com' ) || lowerSrc.includes( 'x.com' ) ) {
		return 'tweet';
	}

	return 'embed';
}

/**
 * MediaThumbnail component.
 *
 * @param {Object}   props               Component props.
 * @param {string}   props.src           Source URL of the media.
 * @param {string}   props.alt           Alt text for accessibility.
 * @param {boolean}  props.isEmbed       Whether this is an embed (vs image).
 * @param {boolean}  props.isFeatured    Whether this is the featured image.
 * @param {Function} props.onInsert      Callback when inserting into editor.
 * @param {Function} props.onSetFeatured Callback when setting as featured.
 * @param {number}   props.index         Index for accessibility label.
 * @return {JSX.Element} The MediaThumbnail component.
 */
export default function MediaThumbnail( {
	src,
	alt = '',
	isEmbed = false,
	isFeatured = false,
	onInsert,
	onSetFeatured,
	index = 0,
} ) {
	const [ isHovered, setIsHovered ] = useState( false );
	const [ isFocused, setIsFocused ] = useState( false );
	const [ imageError, setImageError ] = useState( false );

	const mediaType = useMemo(
		() => getMediaType( src, isEmbed ),
		[ src, isEmbed ]
	);
	const displayUrl = useMemo(
		() => getDisplayUrl( src, mediaType ),
		[ src, mediaType ]
	);
	const hasBackground = displayUrl && ! imageError;

	/**
	 * Handle click to insert.
	 */
	const handleInsert = useCallback( () => {
		if ( onInsert ) {
			onInsert( { src, type: mediaType, isEmbed } );
		}
	}, [ onInsert, src, mediaType, isEmbed ] );

	/**
	 * Handle keyboard interaction.
	 *
	 * @param {KeyboardEvent} event Key event.
	 */
	const handleKeyDown = useCallback(
		( event ) => {
			if ( event.key === 'Enter' || event.key === ' ' ) {
				event.preventDefault();
				handleInsert();
			}
		},
		[ handleInsert ]
	);

	/**
	 * Handle set as featured image.
	 *
	 * @param {MouseEvent} event Click event.
	 */
	const handleSetFeatured = useCallback(
		( event ) => {
			event.stopPropagation();
			if ( onSetFeatured ) {
				onSetFeatured( src );
			}
		},
		[ onSetFeatured, src ]
	);

	/**
	 * Handle featured button keyboard interaction.
	 *
	 * @param {KeyboardEvent} event Key event.
	 */
	const handleFeaturedKeyDown = useCallback(
		( event ) => {
			if ( event.key === 'Enter' || event.key === ' ' ) {
				event.stopPropagation();
				event.preventDefault();
				handleSetFeatured( event );
			}
		},
		[ handleSetFeatured ]
	);

	/**
	 * Handle image load error.
	 */
	const handleImageError = useCallback( () => {
		setImageError( true );
	}, [] );

	const showOverlay = isHovered || isFocused;
	const mediaIcon = MEDIA_ICONS[ mediaType ];

	// Generate accessible label.
	const accessibleLabel = isEmbed
		? __( 'Embed', 'press-this' ) + ' ' + ( index + 1 )
		: __( 'Image', 'press-this' ) + ' ' + ( index + 1 );

	const classNames = [
		'press-this-media-thumbnail',
		isEmbed && 'is-embed',
		mediaType && `is-${ mediaType }`,
		isFeatured && 'is-featured',
		showOverlay && 'is-active',
		! hasBackground && 'no-background',
	]
		.filter( Boolean )
		.join( ' ' );

	return (
		<div
			className={ classNames }
			tabIndex={ 0 }
			role="button"
			aria-label={ alt || accessibleLabel }
			aria-pressed={ isFeatured }
			onClick={ handleInsert }
			onKeyDown={ handleKeyDown }
			onMouseEnter={ () => setIsHovered( true ) }
			onMouseLeave={ () => setIsHovered( false ) }
			onFocus={ () => setIsFocused( true ) }
			onBlur={ () => setIsFocused( false ) }
			style={
				hasBackground
					? { backgroundImage: `url(${ displayUrl })` }
					: undefined
			}
		>
			{ /* Hidden image for preloading and error detection */ }
			{ displayUrl && (
				<img
					src={ displayUrl }
					alt=""
					className="press-this-media-thumbnail__preload"
					onError={ handleImageError }
					aria-hidden="true"
				/>
			) }

			{ /* Media type icon for non-image media */ }
			{ mediaIcon && ! hasBackground && (
				<span className="press-this-media-thumbnail__icon">
					<span
						className={ `dashicons ${ mediaIcon }` }
						aria-hidden="true"
						style={ { fontSize: '32px', width: '32px', height: '32px' } }
					/>
				</span>
			) }

			{ /* Type icon overlay for embeds */ }
			{ isEmbed && mediaIcon && hasBackground && (
				<span className="press-this-media-thumbnail__type-icon">
					<span
						className={ `dashicons ${ mediaIcon }` }
						aria-hidden="true"
						style={ { fontSize: '20px', width: '20px', height: '20px' } }
					/>
				</span>
			) }

			{ /* Featured image indicator */ }
			{ isFeatured && (
				<span className="press-this-media-thumbnail__featured-badge">
					{ __( 'Featured', 'press-this' ) }
				</span>
			) }

			{ /* Action overlay */ }
			<div
				className="press-this-media-thumbnail__overlay"
				aria-hidden={ ! showOverlay }
			>
				<button
					type="button"
					className="press-this-media-thumbnail__insert-btn"
					onClick={ handleInsert }
					tabIndex={ -1 }
				>
					{ isEmbed
						? __( 'Insert Embed', 'press-this' )
						: __( 'Insert Image', 'press-this' ) }
				</button>

				{ ! isEmbed && (
					<button
						type="button"
						className="press-this-media-thumbnail__featured-btn"
						onClick={ handleSetFeatured }
						onKeyDown={ handleFeaturedKeyDown }
						tabIndex={ showOverlay ? 0 : -1 }
						aria-pressed={ isFeatured }
					>
						{ isFeatured
							? __( 'Remove Featured', 'press-this' )
							: __( 'Set Featured', 'press-this' ) }
					</button>
				) }
			</div>

			{ /* Screen reader only text */ }
			<span className="screen-reader-text">
				{ accessibleLabel }
				{ isFeatured && '. ' + __( 'Featured image', 'press-this' ) }
			</span>
		</div>
	);
}
