import React, { useEffect, useState } from 'react';
import { getWhopUser, validateCustomerMembership } from '../lib/whop-client';
import { Auth } from './Auth';

export const WhopAuth: React.FC = () => {
  const [whopUser, setWhopUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isValidMember, setIsValidMember] = useState(false);

  useEffect(() => {
    const initializeWhopUser = async () => {
      try {
        // Get user from Whop iframe context
        const user = await getWhopUser();
        
        if (user?.id) {
          setWhopUser(user);
          
          // Validate membership if needed
          const membership = await validateCustomerMembership(user.id);
          setIsValidMember(membership?.valid || false);
        }
      } catch (error) {
        console.error('Failed to initialize Whop user:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeWhopUser();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (!isValidMember) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        <p>You must be a valid member to access this app.</p>
      </div>
    );
  }

  // If user is valid, return normal auth component
  return <Auth />;
};