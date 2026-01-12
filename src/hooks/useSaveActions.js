/**
 * useSaveActions Hook
 *
 * Custom hook that provides save action handlers for the Press This editor.
 * Connects to the AJAX save workflow and handles all save-related actions.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { useState, useCallback } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { savePost, serializeBlocks, getPressThisData } from '../utils';

/**
 * Get form values from the Press This form.
 *
 * @return {Object} Form values including title, categories, tags, and post format.
 */
function getFormValues() {
	const form = document.getElementById( 'pressthis-form' );
	if ( ! form ) {
		return {};
	}

	// Get title.
	const titleInput = document.getElementById( 'post_title' );
	const title = titleInput ? titleInput.value : '';

	// Get categories.
	const categories = [];
	form.querySelectorAll(
		'.categories-select input[type="checkbox"]:checked'
	).forEach( ( checkbox ) => {
		categories.push( checkbox.value );
	} );

	// Get tags.
	const tagsInput = form.querySelector( '.the-tags' );
	const tags = tagsInput ? tagsInput.value : '';

	// Get post format.
	const formatInput = form.querySelector(
		'input[name="post_format"]:checked'
	);
	const postFormat = formatInput ? formatInput.value : '';

	return {
		title,
		categories,
		tags,
		postFormat,
	};
}

/**
 * Get nonce and post ID from the form.
 *
 * @return {Object} Object containing nonce and postId.
 */
function getSecurityValues() {
	const form = document.getElementById( 'pressthis-form' );
	const postId = document.getElementById( 'post_ID' )?.value;
	const nonce = form?.querySelector( 'input[name="_wpnonce"]' )?.value;

	return {
		postId,
		nonce,
	};
}

/**
 * Custom hook for managing save actions.
 *
 * @param {Object}   options               Options for the hook.
 * @param {Function} options.getContent    Function to get current editor content.
 * @param {Function} options.onSaveSuccess Callback after successful save.
 * @param {Function} options.onSaveError   Callback after save error.
 * @return {Object} Save action handlers and state.
 */
export default function useSaveActions( {
	getContent,
	onSaveSuccess,
	onSaveError,
} = {} ) {
	const [ isSaving, setIsSaving ] = useState( false );
	const [ lastError, setLastError ] = useState( null );

	/**
	 * Get the editor content.
	 *
	 * @return {string} Serialized content.
	 */
	const getEditorContent = useCallback( () => {
		// Try using provided getContent function.
		if ( getContent ) {
			return getContent();
		}

		// Try global editor API.
		if ( window.pressThisEditor && window.pressThisEditor.getContent ) {
			return window.pressThisEditor.getContent();
		}

		// Fallback to hidden field.
		const contentField = document.getElementById( 'post_content' );
		return contentField ? contentField.value : '';
	}, [ getContent ] );

	/**
	 * Handle redirect after successful save.
	 *
	 * @param {Object} data Response data with redirect info.
	 */
	const handleRedirect = useCallback( ( data ) => {
		if ( ! data?.redirect ) {
			return;
		}

		const config = window.wpPressThisConfig || {};

		if ( data.force ) {
			// Redirect in same window for standard editor.
			window.location.href = data.redirect;
		} else if ( config.redirInParent && window.opener ) {
			// Open in parent for publish.
			window.opener.location.href = data.redirect;
			window.close();
		} else {
			window.location.href = data.redirect;
		}
	}, [] );

	/**
	 * Handle publish action.
	 *
	 * @param {string} status Post status (publish or pending).
	 */
	const handlePublish = useCallback(
		async ( status = 'publish' ) => {
			setIsSaving( true );
			setLastError( null );

			const { postId, nonce } = getSecurityValues();
			const { title, categories, tags, postFormat } = getFormValues();
			const content = getEditorContent();

			try {
				const result = await savePost( {
					content,
					title,
					status,
					postId,
					nonce,
					categories,
					tags,
					postFormat,
				} );

				if ( result.success ) {
					if ( onSaveSuccess ) {
						onSaveSuccess( result.data );
					}
					handleRedirect( result.data );
				} else {
					setLastError( result.error );
					if ( onSaveError ) {
						onSaveError( result.error );
					}
				}
			} catch ( error ) {
				setLastError( error.message );
				if ( onSaveError ) {
					onSaveError( error.message );
				}
			} finally {
				setIsSaving( false );
			}
		},
		[ getEditorContent, handleRedirect, onSaveSuccess, onSaveError ]
	);

	/**
	 * Handle save draft action.
	 *
	 * @param {string} status Post status (draft).
	 */
	const handleSaveDraft = useCallback(
		async ( status = 'draft' ) => {
			setIsSaving( true );
			setLastError( null );

			const { postId, nonce } = getSecurityValues();
			const { title, categories, tags, postFormat } = getFormValues();
			const content = getEditorContent();

			try {
				const result = await savePost( {
					content,
					title,
					status,
					postId,
					nonce,
					categories,
					tags,
					postFormat,
				} );

				if ( result.success ) {
					if ( onSaveSuccess ) {
						onSaveSuccess( result.data );
					}
					// Show success notification without redirect.
					showSuccessNotification();
				} else {
					setLastError( result.error );
					if ( onSaveError ) {
						onSaveError( result.error );
					}
				}
			} catch ( error ) {
				setLastError( error.message );
				if ( onSaveError ) {
					onSaveError( error.message );
				}
			} finally {
				setIsSaving( false );
			}
		},
		[ getEditorContent, onSaveSuccess, onSaveError ]
	);

	/**
	 * Handle standard editor redirect.
	 */
	const handleStandardEditor = useCallback( async () => {
		setIsSaving( true );
		setLastError( null );

		const { postId, nonce } = getSecurityValues();
		const { title, categories, tags, postFormat } = getFormValues();
		const content = getEditorContent();

		try {
			const result = await savePost( {
				content,
				title,
				status: 'draft',
				postId,
				nonce,
				categories,
				tags,
				postFormat,
				forceRedirect: true,
			} );

			if ( result.success ) {
				if ( onSaveSuccess ) {
					onSaveSuccess( result.data );
				}
				handleRedirect( result.data );
			} else {
				setLastError( result.error );
				if ( onSaveError ) {
					onSaveError( result.error );
				}
			}
		} catch ( error ) {
			setLastError( error.message );
			if ( onSaveError ) {
				onSaveError( error.message );
			}
		} finally {
			setIsSaving( false );
		}
	}, [ getEditorContent, handleRedirect, onSaveSuccess, onSaveError ] );

	/**
	 * Handle preview action.
	 */
	const handlePreview = useCallback( async () => {
		setIsSaving( true );
		setLastError( null );

		const { postId, nonce } = getSecurityValues();
		const { title } = getFormValues();
		const content = getEditorContent();

		try {
			const result = await savePost( {
				content,
				title,
				status: 'draft',
				postId,
				nonce,
			} );

			if ( result.success ) {
				// Open preview in new tab.
				const previewUrl = `${ window.location.origin }/?p=${ postId }&preview=true`;
				window.open( previewUrl, '_blank' );
			} else {
				setLastError( result.error );
				if ( onSaveError ) {
					onSaveError( result.error );
				}
			}
		} catch ( error ) {
			setLastError( error.message );
			if ( onSaveError ) {
				onSaveError( error.message );
			}
		} finally {
			setIsSaving( false );
		}
	}, [ getEditorContent, onSaveError ] );

	return {
		isSaving,
		lastError,
		handlePublish,
		handleSaveDraft,
		handleStandardEditor,
		handlePreview,
	};
}

/**
 * Show a success notification.
 */
function showSuccessNotification() {
	const l10n = window.pressThisL10n || {};
	const message = l10n.saved || 'Draft saved';

	// Create notification element.
	const notification = document.createElement( 'div' );
	notification.className = 'press-this-notification is-success';
	notification.textContent = message;
	notification.setAttribute( 'role', 'status' );
	notification.setAttribute( 'aria-live', 'polite' );

	document.body.appendChild( notification );

	// Remove after 2 seconds.
	setTimeout( () => {
		notification.classList.add( 'is-fading' );
		setTimeout( () => {
			notification.remove();
		}, 300 );
	}, 2000 );
}
