/**
 * @typedef {Object} ProductPhase1
 * @property {number} id - Unique product identifier
 * @property {string} title - Product name
 * @property {number} price - Price in USD
 * @property {string} thumbnail - Small image URL
 */

/**
 * @typedef {Object} ProductPhase2
 * @property {number} id
 * @property {string} title
 * @property {number} price
 * @property {string} description - Full product description
 * @property {number} rating - Rating out of 5
 * @property {number} stock - Available quantity
 * @property {string} brand - Brand name
 * @property {string} category - Product category
 * @property {string[]} images - Array of full-size image URLs
 * @property {string} thumbnail
 */

/**
 * @typedef {ProductPhase1 | ProductPhase2} Product
 * @property {boolean} [isEnriched] - Whether Phase 2 data has been merged
 */

/**
 * @typedef {Object} ProductsResponse
 * @property {Product[]} products - Array of products
 * @property {number} total - Total products in database
 * @property {number} skip - Number of products skipped (offset)
 * @property {number} limit - Number of products per page
 */

/**
 * @typedef {Object} FetchState
 * @property {Product[]} products
 * @property {boolean} isLoadingPhase1
 * @property {boolean} isLoadingPhase2
 * @property {string|null} errorPhase1
 * @property {string|null} errorPhase2
 * @property {number} currentPage
 * @property {number} totalPages
 */