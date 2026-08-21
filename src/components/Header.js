/**
 * Header Component
 *
 * Main header for Press This with site info, undo/redo toolbar, URL scanner, and publish controls.
 *
 * @package
 */

/* global navigator */

/**
 * WordPress dependencies
 */
import {
	useState,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from '@wordpress/element';
import {
	Button,
	TextControl,
	Notice,
	Tooltip,
	DropdownMenu,
	MenuGroup,
	MenuItem,
	Popover,
	DateTimePicker,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import {
	undo as undoIcon,
	redo as redoIcon,
	moreVertical,
} from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { buildSuggestedContentFromMetadata, isStandaloneMode } from '../utils';

const ONE_MINUTE = 60 * 1000;

/**
 * Detect if running on macOS for keyboard shortcut hints.
 *
 * @return {boolean} True if macOS, false otherwise.
 */
function isMacOS() {
	return (
		typeof navigator !== 'undefined' &&
		/Mac|iPod|iPhone|iPad/.test( navigator.platform )
	);
}

/**
 * Derive a short timezone abbreviation from a timezone string.
 *
 * @param {string} tz   Timezone string (e.g., 'America/New_York' or 'UTC+5').
 * @param {string} date ISO date string to derive abbreviation for (for DST accuracy).
 * @return {string} Timezone abbreviation (e.g., 'EST' or 'UTC+5').
 */
function getTimezoneAbbreviation( tz, date ) {
	if ( ! tz ) {
		return '';
	}

	// Fixed offset timezones pass through directly.
	if ( /^UTC[+-]?\d*$/.test( tz ) ) {
		return tz;
	}

	try {
		const formatter = new Intl.DateTimeFormat( 'en-US', {
			timeZone: tz,
			timeZoneName: 'short',
		} );
		// Parse date parts to build a UTC instant matching the wall-clock time,
		// so DST lookup is correct for the selected date, not the browser's interpretation.
		let refDate = new Date();
		if ( date ) {
			const m = date.match(
				/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/
			);
			if ( m ) {
				refDate = new Date(
					Date.UTC(
						Number( m[ 1 ] ),
						Number( m[ 2 ] ) - 1,
						Number( m[ 3 ] ),
						Number( m[ 4 ] ),
						Number( m[ 5 ] )
					)
				);
			}
		}
		const parts = formatter.formatToParts( refDate );
		const tzPart = parts.find( ( p ) => p.type === 'timeZoneName' );
		return tzPart ? tzPart.value : tz;
	} catch {
		return tz;
	}
}

/**
 * Get the current date/time as an ISO string in the site timezone.
 *
 * @param {string} tz Timezone string.
 * @return {string} ISO 8601 date string.
 */
function getCurrentDateInTimezone( tz ) {
	const pad = ( n ) => String( n ).padStart( 2, '0' );
	const formatNaive = ( d ) =>
		`${ d.getUTCFullYear() }-${ pad( d.getUTCMonth() + 1 ) }-${ pad(
			d.getUTCDate()
		) }T${ pad( d.getUTCHours() ) }:${ pad( d.getUTCMinutes() ) }:${ pad(
			d.getUTCSeconds()
		) }`;

	if ( ! tz ) {
		return formatNaive( new Date() );
	}

	// Handle fixed-offset timezones (e.g. "UTC+2", "UTC-10") which
	// Intl.DateTimeFormat does not accept.
	const offsetMatch = tz.match( /^UTC([+-]\d+(?:\.\d+)?)$/ );
	if ( offsetMatch ) {
		const offsetHours = parseFloat( offsetMatch[ 1 ] );
		const now = new Date();
		// Shift UTC time by the fixed offset to get wall-clock time.
		return formatNaive( new Date( now.getTime() + offsetHours * 3600000 ) );
	}

	try {
		const now = new Date();
		const formatter = new Intl.DateTimeFormat( 'en-CA', {
			timeZone: tz,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		} );
		const parts = formatter.formatToParts( now );
		const get = ( type ) =>
			parts.find( ( p ) => p.type === type )?.value || '';
		return `${ get( 'year' ) }-${ get( 'month' ) }-${ get( 'day' ) }T${ get(
			'hour'
		) }:${ get( 'minute' ) }:${ get( 'second' ) }`;
	} catch {
		return formatNaive( new Date() );
	}
}

/**
 * Parse a naive datetime string to UTC milliseconds by extracting parts directly,
 * avoiding browser-local timezone interpretation via new Date().
 *
 * @param {string} dateString Naive ISO date string (e.g., "2026-03-07T15:00:00").
 * @return {number} Milliseconds (as if the wall-clock time were in UTC).
 */
function parseNaiveToMs( dateString ) {
	const m = dateString.match( /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/ );
	if ( ! m ) {
		return new Date( dateString ).getTime();
	}
	return Date.UTC(
		Number( m[ 1 ] ),
		Number( m[ 2 ] ) - 1,
		Number( m[ 3 ] ),
		Number( m[ 4 ] ),
		Number( m[ 5 ] )
	);
}

/**
 * Check whether a date string represents a future date using a 1-minute buffer.
 * Matches Gutenberg's isEditedPostBeingScheduled pattern.
 *
 * Both dateString and the current time are parsed as wall-clock parts via
 * parseNaiveToMs to avoid browser-local timezone reinterpretation at DST boundaries.
 *
 * @param {string} dateString ISO date string to check (naive, in site timezone).
 * @param {string} tz         Site timezone string.
 * @return {boolean} True if the date is more than 1 minute in the future.
 */
function isFutureDate( dateString, tz ) {
	const selectedMs = parseNaiveToMs( dateString );
	const nowInSiteTz = getCurrentDateInTimezone( tz );
	const nowMs = parseNaiveToMs( nowInSiteTz );
	return selectedMs - nowMs > ONE_MINUTE;
}

/**
 * Header component.
 *
 * @param {Object}   props                       Component props.
 * @param {string}   props.siteName              Site name.
 * @param {string}   props.siteUrl               Site URL.
 * @param {string}   props.adminUrl              Admin URL used by the site name link.
 * @param {string}   props.sourceUrl             Source URL being clipped.
 * @param {boolean}  props.isLegacyBookmarklet   Whether this is a legacy bookmarklet.
 * @param {boolean}  props.hasBookmarkletContent Whether content was already provided by bookmarklet.
 * @param {boolean}  props.hasBookmarkletMedia   Whether media was already provided by bookmarklet.
 * @param {boolean}  props.proxyEnabled          Whether URL proxy is enabled.
 * @param {string}   props.restUrl               REST API base URL.
 * @param {string}   props.restNonce             REST API nonce.
 * @param {Function} props.onScrapeComplete      Callback when scraping completes.
 * @param {Function} props.onSave                Callback for save operations (status, options).
 * @param {boolean}  props.isSaving              Whether a save operation is in progress.
 * @param {string}   props.publishLabel          Label for the publish button.
 * @param {Function} props.onUndo                Undo callback.
 * @param {Function} props.onRedo                Redo callback.
 * @param {boolean}  props.hasUndo               Whether undo is available.
 * @param {boolean}  props.hasRedo               Whether redo is available.
 * @param {Object}   props.capabilities          User capabilities.
 * @param {string}   props.timezone              Site timezone string from wp_timezone_string().
 * @param {string}   props.postStatus            Current post status.
 * @param {string}   props.postDate              Current post date (ISO 8601).
 * @return {JSX.Element} Header component.
 */
export {
	getTimezoneAbbreviation,
	getCurrentDateInTimezone,
	parseNaiveToMs,
	isFutureDate,
};

export default function Header( {
	siteName,
	siteUrl,
	adminUrl,
	sourceUrl,
	isLegacyBookmarklet,
	hasBookmarkletContent = false,
	hasBookmarkletMedia = false,
	proxyEnabled,
	restUrl,
	restNonce,
	onScrapeComplete,
	onSave,
	isSaving = false,
	publishLabel = __( 'Publish', 'press-this' ),
	onUndo,
	onRedo,
	hasUndo = false,
	hasRedo = false,
	capabilities = {},
	timezone = '',
	postStatus = '',
	postDate = '',
} ) {
	const [ scanUrl, setScanUrl ] = useState( sourceUrl || '' );
	const [ isScanning, setIsScanning ] = useState( false );
	const [ scanError, setScanError ] = useState( '' );
	const [ showUpgradeNotice, setShowUpgradeNotice ] =
		useState( isLegacyBookmarklet );

	// Detect standalone display mode (added to home screen).
	// Display mode doesn't change during the page lifecycle, so compute once.
	const isStandalone = useMemo( () => isStandaloneMode(), [] );

	// Schedule popover state.
	const [ isScheduleOpen, setIsScheduleOpen ] = useState( false );
	const [ scheduleDate, setScheduleDate ] = useState( () => {
		if ( postStatus === 'future' && postDate ) {
			return postDate;
		}
		return getCurrentDateInTimezone( timezone );
	} );

	// Track if initial auto-scan has been performed.
	const hasAutoScanned = useRef( false );

	// Ref for anchoring the schedule popover near the More actions button.
	const moreMenuRef = useRef( null );

	// Keyboard shortcut hints based on platform.
	const undoShortcut = isMacOS() ? '\u2318Z' : 'Ctrl+Z';
	const redoShortcut = isMacOS() ? '\u21E7\u2318Z' : 'Ctrl+Shift+Z';

	const timezoneAbbreviation = useMemo(
		() => getTimezoneAbbreviation( timezone, scheduleDate ),
		[ timezone, scheduleDate ]
	);
	const isScheduleFuture = useMemo(
		() => isFutureDate( scheduleDate, timezone ),
		[ scheduleDate, timezone ]
	);
	const scheduleButtonLabel = isScheduleFuture
		? __( 'Schedule', 'press-this' )
		: __( 'Publish', 'press-this' );

	const scheduleMenuLabel =
		postStatus === 'future'
			? __( 'Reschedule', 'press-this' )
			: __( 'Schedule', 'press-this' );

	/**
	 * Handle URL scan via proxy API.
	 *
	 * Server returns sanitized metadata instead of raw HTML.
	 * We no longer parse HTML client-side - the server handles extraction and sanitization.
	 *
	 * @param {boolean} mediaOnly If true, only fetch media (images/embeds), not content.
	 */
	const handleProxyScan = useCallback(
		async ( mediaOnly = false ) => {
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
					throw new Error(
						data.message ||
							__( 'Failed to fetch URL', 'press-this' )
					);
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
						const suggestedContent =
							buildSuggestedContentFromMetadata( {
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
		},
		[ scanUrl, restUrl, restNonce, onScrapeComplete ]
	);

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
	}, [
		sourceUrl,
		proxyEnabled,
		hasBookmarkletContent,
		hasBookmarkletMedia,
		handleProxyScan,
	] );

	/**
	 * Handle scan form submit.
	 *
	 * @param {Event} event Form submit event.
	 */
	const handleScanSubmit = useCallback(
		( event ) => {
			event.preventDefault();
			handleScan();
		},
		[ handleScan ]
	);

	/**
	 * Handle Save Draft button click.
	 */
	const handleSaveDraft = useCallback( () => {
		if ( onSave ) {
			onSave( 'draft' );
		}
	}, [ onSave ] );

	/**
	 * Handle Publish button click.
	 */
	const handlePublish = useCallback( () => {
		if ( onSave ) {
			onSave( 'publish' );
		}
	}, [ onSave ] );

	/**
	 * Handle Continue in Standard Editor.
	 */
	const handleContinueInEditor = useCallback( () => {
		if ( onSave ) {
			onSave( 'draft', { forceRedirect: true } );
		}
	}, [ onSave ] );

	/**
	 * Handle schedule confirmation.
	 *
	 * Re-checks isFutureDate at click time so the button action is always
	 * correct even if time has elapsed since the popover was opened.
	 * If the selected time has passed, we publish immediately rather than
	 * sending status=future with a past date. This matches WordPress core
	 * behavior (wp_insert_post auto-converts future+past to publish).
	 */
	const handleScheduleConfirm = useCallback( () => {
		if ( ! onSave ) {
			return;
		}

		if ( isFutureDate( scheduleDate, timezone ) ) {
			onSave( 'future', { date: scheduleDate } );
		} else {
			onSave( 'publish' );
		}

		setIsScheduleOpen( false );
	}, [ onSave, scheduleDate, timezone ] );

	// Only show scanner when proxy is enabled.
	// Without proxy, server-side scraping doesn't work - the scanner would be non-functional.
	// Bookmarklet flow works without proxy (client-side scraping) but doesn't need the scanner UI.
	const showScanner = proxyEnabled;

	// Only show publish controls if onSave callback is provided.
	const showPublishControls = typeof onSave === 'function';

	return (
		<header className="press-this-header">
			<div className="press-this-header__bar">
				<div className="press-this-header__site">
					<a
						href={ adminUrl || siteUrl }
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

				{ /* Undo/Redo Toolbar */ }
				<div className="press-this-header__toolbar">
					<Tooltip
						text={ `${ __(
							'Undo',
							'press-this'
						) } (${ undoShortcut })` }
					>
						<Button
							className="press-this-header__toolbar-button"
							icon={ undoIcon }
							onClick={ onUndo }
							disabled={ ! hasUndo }
							aria-label={ __( 'Undo', 'press-this' ) }
						/>
					</Tooltip>
					<Tooltip
						text={ `${ __(
							'Redo',
							'press-this'
						) } (${ redoShortcut })` }
					>
						<Button
							className="press-this-header__toolbar-button"
							icon={ redoIcon }
							onClick={ onRedo }
							disabled={ ! hasRedo }
							aria-label={ __( 'Redo', 'press-this' ) }
						/>
					</Tooltip>
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
							placeholder={ __(
								'Enter a URL to scan',
								'press-this'
							) }
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

				{ showPublishControls && (
					<div className="press-this-header__actions">
						<Button
							variant="tertiary"
							onClick={ handleSaveDraft }
							disabled={ isSaving }
							className="press-this-header__save-draft"
						>
							{ __( 'Save Draft', 'press-this' ) }
						</Button>
						<Button
							variant="primary"
							onClick={ handlePublish }
							disabled={ isSaving }
							isBusy={ isSaving }
							className="press-this-header__publish"
						>
							{ publishLabel }
						</Button>
						<div ref={ moreMenuRef }>
							<DropdownMenu
								icon={ moreVertical }
								label={ __( 'More actions', 'press-this' ) }
								className="press-this-header__more-menu"
							>
								{ ( { onClose } ) => (
									<>
										<MenuGroup>
											<MenuItem
												onClick={ () => {
													handleContinueInEditor();
													onClose();
												} }
											>
												{ __(
													'Continue in Standard Editor',
													'press-this'
												) }
											</MenuItem>
										</MenuGroup>
										{ capabilities.canPublish && (
											<MenuGroup>
												<MenuItem
													onClick={ () => {
														setIsScheduleOpen(
															true
														);
														setScheduleDate(
															postStatus ===
																'future' &&
																postDate
																? postDate
																: getCurrentDateInTimezone(
																		timezone
																  )
														);
														onClose();
													} }
												>
													{ scheduleMenuLabel }
												</MenuItem>
											</MenuGroup>
										) }
										{ isStandalone && (
											<MenuGroup>
												<MenuItem
													href={ siteUrl }
													onClick={ onClose }
												>
													{ __(
														'View Site',
														'press-this'
													) }
												</MenuItem>
												<MenuItem
													onClick={ () => {
														// Reload without query params for a blank post.
														window.location.href =
															window.location.pathname;
													} }
												>
													{ __(
														'New Post',
														'press-this'
													) }
												</MenuItem>
											</MenuGroup>
										) }
									</>
								) }
							</DropdownMenu>
						</div>
						{ isScheduleOpen && (
							<Popover
								anchor={ moreMenuRef.current }
								onClose={ () => setIsScheduleOpen( false ) }
								placement="bottom-end"
								className="press-this-header__schedule-popover"
								aria-label={ __(
									'Schedule post',
									'press-this'
								) }
							>
								<div className="press-this-header__schedule-popover-content">
									<DateTimePicker
										currentDate={ scheduleDate }
										onChange={ setScheduleDate }
									/>
									{ timezoneAbbreviation && (
										<p className="press-this-header__schedule-timezone">
											{ timezoneAbbreviation }
										</p>
									) }
									<Button
										variant="primary"
										onClick={ handleScheduleConfirm }
										disabled={ isSaving }
										isBusy={ isSaving }
										className="press-this-header__schedule-confirm"
									>
										{ scheduleButtonLabel }
									</Button>
								</div>
							</Popover>
						) }
					</div>
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
					{ __(
						'Your bookmarklet is out of date. Please update it for the best experience.',
						'press-this'
					) }
				</Notice>
			) }
		</header>
	);
}
