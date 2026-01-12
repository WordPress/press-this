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
import { useMemo, useState, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Header from './components/Header';
import PressThisEditor from './components/PressThisEditor';

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
				/>
			</div>
		</div>
	);
}
