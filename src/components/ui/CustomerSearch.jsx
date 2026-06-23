import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import api from '../../lib/api';

export default function CustomerSearch({ value, onSelect, selectedName = '' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/customers', { params: { search: query } });
        setResults(data.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (customer) => {
    onSelect(customer);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="space-y-1 relative">
      <label className="block text-sm font-medium text-gray-700">Select Customer</label>

      {value ? (
        /* Selected customer display */
        <div className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
          <span className="text-sm text-gray-900 font-medium">{selectedName}</span>
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Search input */
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={() => { if (query) setIsOpen(true); }}
            placeholder="Search by name or phone..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          />
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && !value && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
          ) : results.length === 0 && query ? (
            <div className="px-4 py-3 text-sm text-gray-500">No customers found</div>
          ) : (
            results.map((customer) => (
              <button
                key={customer._id}
                type="button"
                onClick={() => handleSelect(customer)}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                <p className="text-xs text-gray-500">{customer.phone}{customer.address ? ` • ${customer.address}` : ''}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
