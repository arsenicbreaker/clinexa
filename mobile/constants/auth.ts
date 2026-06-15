import { useState, useEffect } from 'react';

// Global shared state for simulating login session status
let currentLoginState = false;
const subscribers = new Set<(state: boolean) => void>();

export const authState = {
  isLoggedIn: () => currentLoginState,
  login: () => {
    currentLoginState = true;
    subscribers.forEach(cb => cb(true));
  },
  logout: () => {
    currentLoginState = false;
    subscribers.forEach(cb => cb(false));
  },
  subscribe: (cb: (state: boolean) => void) => {
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }
};

export function useAuth() {
  const [loggedIn, setLoggedIn] = useState(currentLoginState);

  useEffect(() => {
    return authState.subscribe(setLoggedIn);
  }, []);

  return {
    isLoggedIn: loggedIn,
    login: authState.login,
    logout: authState.logout,
  };
}
