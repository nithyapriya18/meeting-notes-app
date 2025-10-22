import axios from 'axios';

// Initialize Whop SDK client-side
const whopClient = axios.create({
  baseURL: process.env.REACT_APP_WHOP_API_URL || 'https://api.whop.com/api/v2',
  headers: {
    'Content-Type': 'application/json',
  }
});

// Get user token from Whop iframe context
export const getWhopUserToken = (): string | null => {
  // When embedded in Whop iframe, user info is passed via window message
  return (window as any).__whop_user_token || null;
};

// Get current user from Whop
export const getWhopUser = async () => {
  try {
    const token = getWhopUserToken();
    if (!token) return null;

    const response = await whopClient.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get Whop user:', error);
    return null;
  }
};

// Validate customer membership
export const validateCustomerMembership = async (memberId: string) => {
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_BACKEND_URL}/api/validate-membership`,
      { memberId },
      {
        headers: {
          'Authorization': `Bearer ${getWhopUserToken()}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to validate membership:', error);
    return null;
  }
};

export default whopClient;