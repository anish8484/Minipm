import React, { createContext, useContext, useState, useEffect } from 'react';

const OrgContext = createContext(null);

export const OrgProvider = ({ children }) => {
  const [selectedOrg, setSelectedOrg] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('selectedOrg');
    if (stored) {
      setSelectedOrg(JSON.parse(stored));
    }
  }, []);

  const selectOrg = (org) => {
    localStorage.setItem('selectedOrg', JSON.stringify(org));
    setSelectedOrg(org);
  };

  const clearOrg = () => {
    localStorage.removeItem('selectedOrg');
    setSelectedOrg(null);
  };

  return (
    <OrgContext.Provider value={{ selectedOrg, selectOrg, clearOrg }}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
};
