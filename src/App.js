/**
 * Press This Main App Component
 *
 * The root component for the Press This application.
 * Uses the native Gutenberg editor for a streamlined editing experience.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { useMemo, useState, useCallback, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Header from './components/Header';
import PressThisEditor from './components/PressThisEditor';
import { buildSuggestedContentFromMetadata } from './utils';

/**
 * Get initial data from PHP.
 *
 * @return {Object} Press This data from window.pressThisData.
 */
function getInitialData() {
	return window.pressThisData || {};
}

/**
 * Main App component.
 *
 * @return {JSX.Element} The App component.
 */
export default function App() {
	const data = useMemo( () => getInitialData(), [] );

	// State for pending scraped content to append.
	const [ pendingScrape, setPendingScrape ] = useState( null );

	// State for save handler from editor.
	const [ saveState, setSaveState ] = useState( {
		handleSave: null,
		isSaving: false,
		publishLabel: __( 'Publish', 'press-this' ),
	} );

	// Build initial post object for editor.
	const post = useMemo( () => ( {
		id: data.postId,
		title: data.title || '',
		content: data.content || '',
	} ), [ data.postId, data.title, data.content ] );

	// Track additional scraped images/embeds.
	const [ additionalMedia, setAdditionalMedia ] = useState( { images: [], embeds: [] } );

	// Build editor settings.
	const settings = useMemo( () => ( {
		allowedBlocks: data.allowedBlocks || [],
		isRTL: data.isRTL,
		suggestedPostFormat: data.suggestedFormat || '',
	} ), [ data.allowedBlocks, data.isRTL, data.suggestedFormat ] );

	// Build capabilities object.
	const capabilities = useMemo( () => ( {
		canPublish: data.canPublish,
		canUploadFiles: data.canUploadFiles,
		canAssignCategories: data.canAssignCategories,
		canEditCategories: data.canEditCategories,
		canAssignTags: data.canAssignTags,
	} ), [ data.canPublish, data.canUploadFiles, data.canAssignCategories, data.canEditCategories, data.canAssignTags ] );

	// Build REST config object.
	const restConfig = useMemo( () => ( {
		restUrl: data.restUrl,
		restNonce: data.restNonce,
		redirInParent: data.redirInParent,
	} ), [ data.restUrl, data.restNonce, data.redirInParent ] );

	// Combine initial and additional scraped media.
	const images = useMemo( () => {
		const combined = [ ...( data.images || [] ), ...additionalMedia.images ];
		// Deduplicate by URL.
		return [ ...new Set( combined ) ];
	}, [ data.images, additionalMedia.images ] );

	const embeds = useMemo( () => {
		const combined = [ ...( data.embeds || [] ), ...additionalMedia.embeds ];
		return [ ...new Set( combined ) ];
	}, [ data.embeds, additionalMedia.embeds ] );

	const sourceUrl = additionalMedia.sourceUrl || data.sourceUrl || '';

	// State to track if we've received postMessage data.
	const [ postMessageReceived, setPostMessageReceived ] = useState( false );

	// State for title/content that may come from postMessage.
	const [ postMessageData, setPostMessageData ] = useState( null );

	/**
	 * Validate embed URLs through WordPress oEmbed providers.
	 *
	 * @param {Array} urls Array of embed URLs to validate.
	 * @return {Promise<Array>} Promise resolving to array of valid embed URLs.
	 */
	const validateEmbeds = useCallback( async ( urls ) => {
		if ( ! urls || urls.length === 0 ) {
			return [];
		}

		try {
			const response = await fetch( `${ data.restUrl }validate-embeds`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': data.restNonce,
				},
				body: JSON.stringify( { urls } ),
			} );

			if ( ! response.ok ) {
				// On error, return empty array (fail safe).
				return [];
			}

			const result = await response.json();
			return result.embeds || [];
		} catch {
			// On network error, return empty array.
			return [];
		}
	}, [ data.restUrl, data.restNonce ] );

	/**
	 * Listen for postMessage data from bookmarklet.
	 * This is used when the bookmarklet opens Press This via GET (to send cookies)
	 * and then sends scraped data via postMessage.
	 */
	useEffect( () => {
		// Only listen if we're in postMessage mode and haven't received data yet.
		if ( ! data.postMessageMode || postMessageReceived ) {
			return;
		}

		async function handleMessage( event ) {
			// Validate message structure.
			if ( ! event.data || event.data.type !== 'press-this-data' ) {
				return;
			}

			const messageData = event.data.data;
			if ( ! messageData ) {
				return;
			}

			// Mark as received so we stop listening.
			setPostMessageReceived( true );

			// Store the received data.
			setPostMessageData( messageData );

			// Process images (no validation needed).
			const receivedImages = messageData._images || [];
			const receivedSourceUrl = messageData.u || data.sourceUrl;

			// Validate embeds through WordPress oEmbed providers.
			const rawEmbeds = messageData._embeds || [];
			const validatedEmbeds = await validateEmbeds( rawEmbeds );

			// Update media state with validated embeds.
			setAdditionalMedia( ( prev ) => ( {
				images: [ ...prev.images, ...receivedImages ],
				embeds: [ ...prev.embeds, ...validatedEmbeds ],
				sourceUrl: receivedSourceUrl,
			} ) );

			// Build suggested content from bookmarklet metadata.
			// Extract description from meta tags.
			const meta = messageData._meta || {};
			const description = messageData.s || // User selection takes priority.
				meta[ 'twitter:description' ] ||
				meta[ 'og:description' ] ||
				meta.description ||
				'';

			const title = messageData.t ||
				meta[ 'twitter:title' ] ||
				meta[ 'og:title' ] ||
				meta.title ||
				'';

			// Get canonical URL.
			const links = messageData._links || {};
			const canonical = links.canonical || receivedSourceUrl;

			// Build suggested content using the same utility as Header.
			const suggestedContent = buildSuggestedContentFromMetadata( {
				title,
				description,
				siteName: meta[ 'og:site_name' ] || '',
				canonical,
				url: receivedSourceUrl,
			} );

			// Set as pending scrape so the editor will process it.
			if ( title || suggestedContent ) {
				setPendingScrape( {
					title,
					content: suggestedContent,
					images: receivedImages,
					embeds: validatedEmbeds,
					sourceUrl: receivedSourceUrl,
				} );
			}
		}

		window.addEventListener( 'message', handleMessage );

		return () => {
			window.removeEventListener( 'message', handleMessage );
		};
	}, [ data.postMessageMode, data.restUrl, data.restNonce, data.sourceUrl, postMessageReceived, validateEmbeds ] );

	/**
	 * Handle scrape completion from Header.
	 * Sets pending scrape data for the editor to process.
	 *
	 * @param {Object} result Scraped data.
	 */
	const handleScrapeComplete = useCallback( ( result ) => {
		// Only set pending scrape if there's content to append (not media-only scans).
		if ( ! result.mediaOnly && result.content ) {
			setPendingScrape( result );
		}

		// Add new images/embeds to the media panel.
		setAdditionalMedia( ( prev ) => ( {
			images: [ ...prev.images, ...( result.images || [] ) ],
			embeds: [ ...prev.embeds, ...( result.embeds || [] ) ],
			sourceUrl: result.sourceUrl,
		} ) );
	}, [] );

	/**
	 * Called by editor after it has processed the pending scrape.
	 */
	const handleScrapeProcessed = useCallback( () => {
		setPendingScrape( null );
	}, [] );

	/**
	 * Handle save state updates from PressThisEditor.
	 *
	 * @param {Object} state Save state with handleSave, isSaving, publishLabel.
	 */
	const handleSaveReady = useCallback( ( state ) => {
		setSaveState( state );
	}, [] );

	return (
		<div className="press-this-app">
			<Header
				siteName={ data.siteName }
				siteUrl={ data.siteUrl }
				sourceUrl={ data.sourceUrl }
				isLegacyBookmarklet={ data.isLegacyBookmarklet }
				hasBookmarkletContent={ !! data.content }
				hasBookmarkletMedia={ !! ( data.images?.length || data.embeds?.length ) }
				proxyEnabled={ data.proxyEnabled }
				restUrl={ data.restUrl }
				restNonce={ data.restNonce }
				onScrapeComplete={ handleScrapeComplete }
				onSave={ saveState.handleSave }
				isSaving={ saveState.isSaving }
				publishLabel={ saveState.publishLabel }
			/>

			<div className="press-this-app__body">
				<PressThisEditor
					post={ post }
					settings={ settings }
					images={ images }
					embeds={ embeds }
					categories={ data.categories || [] }
					postFormats={ data.postFormats || [] }
					capabilities={ capabilities }
					restConfig={ restConfig }
					sourceUrl={ sourceUrl }
					pendingScrape={ pendingScrape }
					onScrapeProcessed={ handleScrapeProcessed }
					onSaveReady={ handleSaveReady }
					categoryNonce={ data.categoryNonce || '' }
					ajaxUrl={ data.ajaxUrl || '' }
				/>
			</div>
		</div>
	);
}
