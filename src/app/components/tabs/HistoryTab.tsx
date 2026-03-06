'use client';

import React from 'react';

/**
 * HistoryTab - User's bet history
 */
export default function HistoryTab() {
  return (
    <div className="px-2 py-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      <div className="text-center py-8" style={{ color: '#8b949e' }}>
        <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">No bet history yet</p>
        <p className="text-xs mt-1">Your completed bets will appear here</p>
      </div>
    </div>
  );
}
