/**
 * Header Component
 *
 * Main header for Press This with site info and URL scanner.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { useState, useCallback, useEffect, useRef } from '@wordpress/element';
import { Button, TextControl, Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { buildSuggestedContentFromMetadata } from '../utils';

/**
 * Header component.
 *
 * @param {Object}   props                       Component props.
 * @param {string}   props.siteName              Site name.
 * @param {string}   props.siteUrl               Site URL.
 * @param {string}   props.sourceUrl             Source URL being clipped.
 * @param {boolean}  props.isLegacyBookmarklet   Whether this is a legacy bookmarklet.
 * @param {boolean}  props.hasBookmarkletContent Whether content was already provided by bookmarklet.
 * @param {boolean}  props.hasBookmarkletMedia   Whether media was already provided by bookmarklet.
 * @param {boolean}  props.proxyEnabled          Whether URL proxy is enabled.
 * @param {string}   props.restUrl               REST API base URL.
 * @param {string}   props.restNonce             REST API nonce.
 * @param {Function} props.onScrapeComplete      Callback when scraping completes.
 * @return {JSX.Element} Header component.
 */
export default function Header( {
	siteName,
	siteUrl,
	sourceUrl,
	isLegacyBookmarklet,
	hasBookmarkletContent = false,
	hasBookmarkletMedia = false,
	proxyEnabled,
	restUrl,
	restNonce,
	onScrapeComplete,
} ) {
	const [ scanUrl, setScanUrl ] = useState( sourceUrl || '' );
	const [ isScanning, setIsScanning ] = useState( false );
	const [ scanError, setScanError ] = useState( '' );
	const [ showUpgradeNotice, setShowUpgradeNotice ] = useState( isLegacyBookmarklet );

	// Track if initial auto-scan has been performed.
	const hasAutoScanned = useRef( false );

	/**
	 * Handle URL scan via proxy API.
	 *
	 * Server returns sanitized metadata instead of raw HTML.
	 * We no longer parse HTML client-side - the server handles extraction and sanitization.
	 *
	 * @param {boolean} mediaOnly If true, only fetch media (images/embeds), not content.
	 */
	const handleProxyScan = useCallback( async ( mediaOnly = false ) => {
		if ( ! scanUrl ) {
			return;
		}

		setIsScanning( true );
		setScanError( '' );

		try {
			const response = await fetch( `${ restUrl }scrape`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': restNonce,
				},
				body: JSON.stringify( { url: scanUrl } ),
			} );

			const data = await response.json();

			if ( ! response.ok ) {
				throw new Error( data.message || __( 'Failed to fetch URL', 'press-this' ) );
			}

			// Server returns sanitized metadata object directly.
			// No client-side HTML parsing needed - data.title, data.description,
			// data.images, data.embeds are all pre-sanitized by the server.

			// Callback with scraped data.
			if ( onScrapeComplete ) {
				if ( mediaOnly ) {
					// Only send images/embeds, not content (content already exists).
					onScrapeComplete( {
						title: '',
						content: '',
						images: data.images || [],
						embeds: data.embeds || [],
						sourceUrl: scanUrl,
						mediaOnly: true,
					} );
				} else {
					// Build suggested content from server-sanitized metadata.
					// buildSuggestedContentFromMetadata applies additional escaping.
					const suggestedContent = buildSuggestedContentFromMetadata( {
						title: data.title || '',
						description: data.description || '',
						siteName: '',
						canonical: data.canonical || scanUrl,
						url: data.final_url || scanUrl,
					} );

					onScrapeComplete( {
						title: data.title || '',
						content: suggestedContent,
						images: data.images || [],
						embeds: data.embeds || [],
						sourceUrl: scanUrl,
					} );
				}
			}
		} catch ( error ) {
			setScanError( error.message );
		} finally {
			setIsScanning( false );
		}
	}, [ scanUrl, restUrl, restNonce, onScrapeComplete ] );

	/**
	 * Handle URL scan (redirect method for non-proxy mode).
	 */
	const handleRedirectScan = useCallback( () => {
		if ( ! scanUrl ) {
			return;
		}

		setIsScanning( true );

		// Redirect to Press This with the URL.
		const currentUrl = new URL( window.location.href );
		currentUrl.searchParams.set( 'u', scanUrl );
		window.location.href = currentUrl.toString();
	}, [ scanUrl ] );

	/**
	 * Handle URL scan - uses proxy if enabled, otherwise redirects.
	 */
	const handleScan = useCallback( () => {
		if ( proxyEnabled ) {
			handleProxyScan();
		} else {
			handleRedirectScan();
		}
	}, [ proxyEnabled, handleProxyScan, handleRedirectScan ] );

	/**
	 * Auto-scan on mount if URL is provided via query parameter (Direct Access Mode).
	 * Runs in two modes:
	 * 1. Full scan: when no content exists (fetch content + media)
	 * 2. Media-only scan: when content exists but no media (e.g., GET with selection)
	 */
	useEffect( () => {
		if ( ! sourceUrl || ! proxyEnabled || hasAutoScanned.current ) {
			return;
		}

		if ( ! hasBookmarkletContent ) {
			// No content - do full scan.
			hasAutoScanned.current = true;
			handleProxyScan( false );
		} else if ( ! hasBookmarkletMedia ) {
			// Has content but no media (e.g., GET request with selection) - fetch media only.
			hasAutoScanned.current = true;
			handleProxyScan( true );
		}
	}, [ sourceUrl, proxyEnabled, hasBookmarkletContent, hasBookmarkletMedia, handleProxyScan ] );

	/**
	 * Handle scan form submit.
	 *
	 * @param {Event} event Form submit event.
	 */
	const handleScanSubmit = useCallback( ( event ) => {
		event.preventDefault();
		handleScan();
	}, [ handleScan ] );

	// Only show scanner if proxy is enabled or we're in bookmarklet mode.
	const showScanner = proxyEnabled || sourceUrl;

	return (
		<header className="press-this-header">
			<div className="press-this-header__bar">
				<div className="press-this-header__site">
					<a
						href={ siteUrl }
						target="_blank"
						rel="noopener noreferrer"
						className="press-this-header__site-link"
					>
						<span
							className="dashicons dashicons-wordpress press-this-header__wp-icon"
							aria-hidden="true"
						/>
						<span className="press-this-header__site-name">
							{ siteName }
						</span>
					</a>
				</div>

				{ showScanner && (
					<form
						className="press-this-header__scanner"
						onSubmit={ handleScanSubmit }
					>
						<TextControl
							className="press-this-header__url-input"
							value={ scanUrl }
							onChange={ setScanUrl }
							placeholder={ __( 'Enter a URL to scan', 'press-this' ) }
							type="url"
							hideLabelFromVision
							label={ __( 'URL to scan', 'press-this' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<Button
							variant="secondary"
							onClick={ handleScan }
							disabled={ ! scanUrl || isScanning }
							isBusy={ isScanning }
						>
							{ __( 'Scan', 'press-this' ) }
						</Button>
					</form>
				) }
			</div>

			{ scanError && (
				<Notice
					className="press-this-header__notice"
					status="error"
					onRemove={ () => setScanError( '' ) }
				>
					{ scanError }
				</Notice>
			) }

			{ showUpgradeNotice && (
				<Notice
					className="press-this-header__notice"
					status="warning"
					onRemove={ () => setShowUpgradeNotice( false ) }
				>
					{ __( 'Your bookmarklet is out of date. Please update it for the best experience.', 'press-this' ) }
				</Notice>
			) }
		</header>
	);
}
