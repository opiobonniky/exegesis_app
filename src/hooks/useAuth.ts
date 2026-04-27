/**
 * useAuth hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Simple hook to access auth context
 */

import { useContext } from 'react';
import { AppContext } from '../common/AppContext';

export const useAuth = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAuth must be used within AppProvider');
  }
  return context;
};

export default useAuth;