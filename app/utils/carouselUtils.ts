// Function to properly capitalize preset labels used by the carousels.
// Kept here so multiple components can share the same behavior.
export const capitalizeLabel = (label: string): string => {
  // Handle special cases
  const specialCases: Record<string, string> = {
    'lt-local': 'Local',
    'breaking': 'Breaking',
    'weekend': 'Weekend',
    'arts': 'Arts',
    'tech': 'Tech',
    'sports': 'Sports',
    'health': 'Health',
    'business': 'Business',
    'education': 'Education',
    'environment': 'Environment',
    'entertainment': 'Entertainment',
    'international': 'International',
    'politics': 'Politics',
    'science': 'Science',
    'weather': 'Weather',
    'travel': 'Travel',
    'finance': 'Finance',
    'markets': 'Markets',
    'morning': 'Morning'
  };

  return specialCases[label] || label.charAt(0).toUpperCase() + label.slice(1);
};
