/**
 * Calculate safety record statistics based on incident dates
 * @param {Date[]} incidentDates - Array of dates when incidents occurred
 * @returns {Object} Object containing currentStreak and previousRecord in days
 */
export  const calculateSafetyRecord = (incidentDates) => {
  // Sort dates in ascending order (oldest first)
  const sortedDates = [...incidentDates].sort((a, b) => a - b);
  
  // If no incidents, the current streak is from the beginning of time or a default value
  if (sortedDates.length === 0) {
    return {
      currentStreak: 90, // Default or placeholder value
      previousRecord: 120 // Default or placeholder value
    };
  }
  
  const today = new Date();
  
  // Calculate days since the most recent incident
  const mostRecentIncident = sortedDates[sortedDates.length - 1];
  const currentStreak = Math.floor((today - mostRecentIncident) / (1000 * 60 * 60 * 24));
  
  // Calculate previous record (longest streak between incidents)
  let previousRecord = 0;
  let longestGap = 0;
  
  // If only one incident, the previous record is from the beginning of time to that incident
  // For simplicity, we'll use a default value in this case
  if (sortedDates.length === 1) {
    previousRecord = 120; // Default or placeholder value
  } else {
    // Calculate gaps between incidents
    for (let i = 1; i < sortedDates.length; i++) {
      const gap = Math.floor((sortedDates[i] - sortedDates[i-1]) / (1000 * 60 * 60 * 24));
      if (gap > longestGap) {
        longestGap = gap;
      }
    }
    previousRecord = longestGap;
  }
  
  // If current streak is longer than previous record, swap them
  if (currentStreak > previousRecord) {
    return {
      currentStreak: currentStreak,
      previousRecord: currentStreak // Current streak becomes the new record
    };
  }
  
  return {
    currentStreak: currentStreak,
    previousRecord: previousRecord
  };
};

/**
 * Get default safety record values
 * @returns {Object} Default safety record with currentStreak and previousRecord
 */
export const getDefaultSafetyRecord = () => {
  return {
    currentStreak: 90,
    previousRecord: 120
  };
};