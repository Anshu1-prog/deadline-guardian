/**
 * Date Validator Utility
 * Prevents past dates and invalid calendar combinations (e.g., 31 April, 29 February on non-leap years)
 */
export function validateDate(dateStr: string): { isValid: boolean; error?: string } {
  if (!dateStr) {
    return { isValid: false, error: "Please specify a target date." };
  }
  
  // Basic regex check for YYYY-MM-DD
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return { isValid: false, error: "Invalid date format. Use YYYY-MM-DD." };
  }

  const [year, month, day] = dateStr.split("-").map(Number);
  
  // Check month range
  if (month < 1 || month > 12) {
    return { isValid: false, error: "Month must be between 01 and 12." };
  }

  // Check day range per month (accounting for leap years)
  const isLeapYear = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));
  const daysInMonths = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDays = daysInMonths[month - 1];
  
  if (day < 1 || day > maxDays) {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return { 
      isValid: false, 
      error: `${monthNames[month - 1]} ${year} has max ${maxDays} days. Invalid day: ${day}.` 
    };
  }

  // Check if date is in the past
  const targetDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (targetDate < today) {
    return { isValid: false, error: "Selecting past dates is not permitted. Please schedule for today or the future." };
  }

  return { isValid: true };
}
