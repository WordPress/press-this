/**
 * Term tree utilities.
 *
 * Ported from @wordpress/editor/src/utils/terms.js and the
 * HierarchicalTermSelector filter logic. These are pure functions
 * with no data-store dependencies.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { decodeEntities } from '@wordpress/html-entities';

/**
 * Convert a flat array of terms into a nested tree.
 *
 * @param {Array} flatTerms Array of terms with { id, name, parent, ... }.
 * @return {Array} Array of terms in tree format (each with `children` array).
 */
export function buildTermsTree( flatTerms ) {
	const flatTermsWithParentAndChildren = flatTerms.map( ( term ) => {
		return {
			children: [],
			parent: undefined,
			...term,
		};
	} );

	// All terms should have a `parent` because we're about to index them by it.
	if (
		flatTermsWithParentAndChildren.some(
			( { parent } ) => parent === undefined
		)
	) {
		return flatTermsWithParentAndChildren;
	}

	const termsByParent = flatTermsWithParentAndChildren.reduce(
		( acc, term ) => {
			const { parent } = term;
			if ( ! acc[ parent ] ) {
				acc[ parent ] = [];
			}
			acc[ parent ].push( term );
			return acc;
		},
		{}
	);

	const fillWithChildren = ( terms ) => {
		return terms.map( ( term ) => {
			const children = termsByParent[ term.id ];
			return {
				...term,
				children:
					children && children.length
						? fillWithChildren( children )
						: [],
			};
		} );
	};

	return fillWithChildren( termsByParent[ '0' ] || [] );
}

/**
 * Decode HTML entities in a string.
 *
 * @param {string} arg String to decode.
 * @return {string} Decoded string.
 */
export const unescapeString = ( arg ) => {
	return decodeEntities( arg );
};

/**
 * Return a matcher function that filters a terms tree by a search value.
 *
 * When a child term matches, its ancestor path is preserved in the result
 * so the user sees the hierarchical context.
 *
 * Ported from @wordpress/editor HierarchicalTermSelector.
 *
 * @param {string} filterValue Search string.
 * @return {Function} Matcher that accepts a term tree node and returns the
 *                    (possibly pruned) node or false.
 */
export function getFilterMatcher( filterValue ) {
	const normalizedFilter = filterValue.toLowerCase();

	const matchTermsForFilter = ( originalTerm ) => {
		if ( '' === filterValue ) {
			return originalTerm;
		}

		// Shallow clone so we don't mutate the source tree.
		const term = { ...originalTerm };

		// Recurse into children.
		if ( term.children.length > 0 ) {
			term.children = term.children
				.map( matchTermsForFilter )
				.filter( ( child ) => child );
		}

		// Keep the term if its name matches or if any descendant matched.
		if (
			term.name.toLowerCase().includes( normalizedFilter ) ||
			term.children.length > 0
		) {
			return term;
		}

		return false;
	};

	return matchTermsForFilter;
}
