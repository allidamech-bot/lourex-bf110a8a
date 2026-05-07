/**
 * Centralized validation utilities
 * All validators return string (error message) | null (valid)
 * No validators throw exceptions
 */

/**
 * Validates email format using a basic safe regex pattern
 * @param value - email string to validate
 * @returns error message or null if valid
 */
export const validateEmail = (value: string): string | null => {
  if (!value || value.trim() === "") {
    return "Email is required";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) {
    return "Invalid email format";
  }

  return null;
};

/**
 * Validates phone number (basic length check)
 * @param value - phone string to validate
 * @returns error message or null if valid
 */
export const validatePhone = (value: string): string | null => {
  if (!value || value.trim() === "") {
    return "Phone is required";
  }

  const phoneDigits = value.replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    return "Phone number must have at least 10 digits";
  }

  return null;
};

/**
 * Validates password strength (current: 8+ characters minimum)
 * Preserved for Auth.tsx compatibility
 * @param value - password string to validate
 * @returns error message or null if valid
 */
export const validatePassword = (value: string): string | null => {
  if (!value || value.length === 0) {
    return "Password is required";
  }

  if (value.length < 8) {
    return "Password must be at least 8 characters long";
  }

  return null;
};

/**
 * Validates that a required field is not empty
 * @param value - field value to validate
 * @param fieldName - name of the field for error message
 * @returns error message or null if valid
 */
export const validateRequired = (value: string, fieldName: string = "This field"): string | null => {
  if (!value || value.trim() === "") {
    return `${fieldName} is required`;
  }

  return null;
};
