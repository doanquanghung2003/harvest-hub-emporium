/**
 * Utility functions for matching product categories
 * Handles Vietnamese diacritics, case sensitivity, and various category name formats
 */

/**
 * Normalize a category name by removing diacritics, converting to lowercase, and trimming
 */
export const normalizeCategory = (category: string | undefined | null): string => {
  if (!category) return '';
  return category
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim();
};

/**
 * Check if a product category matches a target category name
 * Supports various formats and variations
 * Uses strict matching to avoid false positives
 */
export const matchesCategory = (
  productCategory: string | undefined | null,
  targetCategoryName: string,
  additionalKeywords: string[] = []
): boolean => {
  if (!productCategory) return false;

  const normalizedProduct = normalizeCategory(productCategory);
  const normalizedTarget = normalizeCategory(targetCategoryName);
  const productCategoryLower = productCategory.toLowerCase().trim();
  const targetCategoryLower = targetCategoryName.toLowerCase().trim();

  // Exact match (case-insensitive)
  if (productCategoryLower === targetCategoryLower) {
    return true;
  }

  // Check if product category contains the full target category name (not just a substring)
  // This prevents "Dụng cụ nông nghiệp" from matching "Rau củ"
  if (productCategoryLower.includes(targetCategoryLower) && 
      targetCategoryLower.length >= 3) { // Only if target is substantial enough
    return true;
  }

  // Check if target contains product category (reverse match, but be careful)
  // Only allow this if the product category is a complete word/phrase
  if (targetCategoryLower.includes(productCategoryLower) && 
      productCategoryLower.length >= 3 &&
      normalizedProduct === normalizedTarget) {
    return true;
  }

  // Check additional keywords - but only if they are substantial
  for (const keyword of additionalKeywords) {
    if (keyword.length < 2) continue; // Skip very short keywords
    
    const normalizedKeyword = normalizeCategory(keyword);
    const keywordLower = keyword.toLowerCase();
    
    // Check if product category contains the keyword as a whole word
    // Use word boundary matching to avoid partial matches
    const keywordRegex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (keywordRegex.test(productCategoryLower)) {
      return true;
    }
    
    // Also check normalized version
    if (normalizedProduct.includes(normalizedKeyword) && normalizedKeyword.length >= 3) {
      return true;
    }
  }

  return false;
};

/**
 * Category matching configurations
 * Maps category display names to their possible database values and keywords
 */
// Exclusion list: keywords that should NOT match a category
const categoryExclusions: Record<string, string[]> = {
  'Rau củ': ['máy', 'dụng cụ', 'nông nghiệp', 'nông sản', 'tool', 'machine', 'thiết bị', 'máy cày', 'máy phun', 'máy cắt'],
  'Dụng cụ nông nghiệp': ['rau', 'củ', 'trái cây', 'fruit', 'vegetable'],
  'Dụng cụ nông sản': ['rau', 'củ', 'trái cây', 'fruit', 'vegetable'],
};

export const categoryMatchers: Record<string, { keywords: string[]; aliases: string[] }> = {
  'Rau củ': {
    keywords: ['rau củ', 'rau cu', 'vegetable', 'vegetables'],
    aliases: ['Rau củ', 'Rau Củ', 'rau củ', 'RAU CỦ', 'Rau Củ Tươi', 'Rau củ tươi']
  },
  'Dụng cụ nông nghiệp': {
    keywords: ['dụng cụ', 'nông nghiệp', 'nông sản', 'dung cu', 'nong nghiep', 'nong san', 'tool', 'tools', 'farm-tools', 'farm tools', 'máy', 'thiết bị'],
    aliases: ['Dụng cụ nông nghiệp', 'Dụng cụ nông sản', 'Dụng Cụ Nông Nghiệp', 'Dụng Cụ Nông Sản']
  },
  'Dụng cụ nông sản': {
    keywords: ['dụng cụ', 'nông nghiệp', 'nông sản', 'dung cu', 'nong nghiep', 'nong san', 'tool', 'tools', 'farm-tools', 'farm tools', 'máy', 'thiết bị'],
    aliases: ['Dụng cụ nông nghiệp', 'Dụng cụ nông sản', 'Dụng Cụ Nông Nghiệp', 'Dụng Cụ Nông Sản']
  },
  'Trái cây': {
    keywords: ['trái cây', 'trai cay', 'fruit', 'fruits'],
    aliases: ['Trái cây', 'Trái Cây', 'trái cây', 'TRÁI CÂY', 'Trái Cây Tươi', 'Trái cây tươi']
  },
  'Ngũ cốc': {
    keywords: ['ngũ cốc', 'ngu coc', 'grain', 'grains'],
    aliases: ['Ngũ cốc', 'Ngũ Cốc', 'ngũ cốc']
  },
  'Hạt giống': {
    keywords: ['hạt giống', 'hat giong', 'seed', 'seeds', 'hạt', 'giống'],
    aliases: ['Hạt giống', 'Hạt Giống', 'hạt giống', 'HẠT GIỐNG', 'Hạt Giống Tươi']
  }
};

/**
 * Check if a product belongs to a specific category using the category matcher
 * Uses strict matching to prevent false positives
 */
export const isProductInCategory = (
  productCategory: string | undefined | null,
  targetCategoryName: string
): boolean => {
  if (!productCategory) return false;
  
  const productCategoryLower = productCategory.toLowerCase().trim();
  
  // First, check exclusions - if product category contains excluded keywords, don't match
  const exclusions = categoryExclusions[targetCategoryName];
  if (exclusions) {
    for (const exclusion of exclusions) {
      const exclusionLower = exclusion.toLowerCase();
      // Check if exclusion appears as a whole word or significant phrase
      if (productCategoryLower.includes(exclusionLower) && exclusionLower.length >= 3) {
        // Double check: only exclude if it's clearly not the target category
        const normalizedProduct = normalizeCategory(productCategory);
        const normalizedTarget = normalizeCategory(targetCategoryName);
        // If the exclusion is present and target category is not clearly present, exclude
        if (!normalizedProduct.includes(normalizedTarget) && 
            !productCategoryLower.includes(targetCategoryName.toLowerCase())) {
          return false;
        }
      }
    }
  }
  
  const matcher = categoryMatchers[targetCategoryName];
  
  if (matcher) {
    // Check aliases first (exact match)
    for (const alias of matcher.aliases) {
      if (productCategory === alias || 
          productCategoryLower === alias.toLowerCase().trim()) {
        return true;
      }
    }
    
    // Check using keywords with strict matching
    return matchesCategory(productCategory, targetCategoryName, matcher.keywords);
  }
  
  // Fallback to basic matching (but still strict)
  return matchesCategory(productCategory, targetCategoryName);
};

