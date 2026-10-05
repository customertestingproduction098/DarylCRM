import React, { useState } from 'react';
import { Search, Phone, User } from 'lucide-react';

export default function SearchBar({ onSearch, placeholder }) {
  const [searchTab, setSearchTab] = useState('phone');
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch({ type: searchTab, query });
    }
  };

  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-3">
      <div className="flex gap-2 border-b border-slate-100 pb-2">
        <button
          type="button"
          onClick={() => setSearchTab('phone')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            searchTab === 'phone'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Phone className="w-3.5 h-3.5" /> Search by Phone
        </button>
        <button
          type="button"
          onClick={() => setSearchTab('lastName')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            searchTab === 'lastName'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-3.5 h-3.5" /> Search by Last Name
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              placeholder ||
              (searchTab === 'phone'
                ? 'Enter phone number (e.g. 555-0101)...'
                : 'Enter customer last name (e.g. Smith)...')
            }
            className="w-full text-sm rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:border-blue-600"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Search
        </button>
      </form>
    </div>
  );
}
