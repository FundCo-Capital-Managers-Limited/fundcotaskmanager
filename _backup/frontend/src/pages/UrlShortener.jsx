import React, { useState, useCallback, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Link2, Copy, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import validator from 'validator';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const UrlShortener = () => {
    const { user, onLogout } = useOutletContext();
    const [longUrl, setLongUrl] = useState('');
    const [shortenedUrl, setShortenedUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [urlHistory, setUrlHistory] = useState([]);
    const [error, setError] = useState('');

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Session expired. Please log in again.', { duration: 5000 });
            onLogout?.();
            throw new Error('No auth token found');
        }
        return { Authorization: `Bearer ${token}` };
    }, [onLogout]);

    const fetchUrlHistory = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/urls/list`, {
                headers: getAuthHeaders(),
            });
            setUrlHistory(response.data.urls || []);
        } catch (error) {
            console.error('Fetch URL history error:', error);
            toast.error(error.response?.data?.message || 'Failed to load URL history.');
            if (error.response?.status === 401) onLogout?.();
        }
    }, [getAuthHeaders, onLogout]);

    useEffect(() => {
        if (user) fetchUrlHistory();
    }, [user, fetchUrlHistory]);

    const handleShortenUrl = useCallback(async () => {
        setError('');
        setShortenedUrl('');

        if (!validator.isURL(longUrl, { require_protocol: true })) {
            setError('Please enter a valid URL (e.g., https://example.com)');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/urls/shorten`,
                { longUrl },
                { headers: getAuthHeaders() }
            );
            setShortenedUrl(response.data.shortUrl);
            toast.success('URL shortened successfully!');
            setLongUrl('');
            fetchUrlHistory();
        } catch (error) {
            console.error('Shorten URL error:', error);
            const message = error.response?.data?.message || 'Failed to shorten URL.';
            setError(message);
            toast.error(message);
            if (error.response?.status === 401) onLogout?.();
        } finally {
            setIsLoading(false);
        }
    }, [longUrl, getAuthHeaders, fetchUrlHistory, onLogout]);

    const handleCopy = useCallback(async (url) => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success('URL copied to clipboard!');
        } catch (error) {
            console.error('Copy error:', error);
            toast.error('Failed to copy URL.');
        }
    }, []);

    const handleDelete = useCallback(
        async (id) => {
            try {
                await axios.delete(`${API_BASE_URL}/api/urls/${id}`, {
                    headers: getAuthHeaders(),
                });
                setUrlHistory((prev) => prev.filter((url) => url._id !== id));
                toast.success('URL deleted.');
            } catch (error) {
                console.error('Delete URL error:', error);
                toast.error(error.response?.data?.message || 'Failed to delete URL.');
                if (error.response?.status === 401) onLogout?.();
            }
        },
        [getAuthHeaders, onLogout]
    );

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
                <p className="text-lg font-medium text-gray-900">Please log in to access the URL shortener.</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex flex-col items-center p-4 sm:p-6"
        >
            <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />

            {/* Header */}
            <header className="w-full max-w-4xl bg-white shadow-md rounded-xl px-6 py-4 mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link2 className="w-7 h-7 text-teal-500" />
                        <h1 className="text-2xl font-bold text-gray-900">URL Shortener</h1>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full max-w-4xl flex-1 space-y-8">
                <motion.section
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-xl p-6 sm:p-8 shadow-lg border border-teal-100"
                >
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Shorten a URL</h2>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                value={longUrl}
                                onChange={(e) => setLongUrl(e.target.value)}
                                placeholder="Paste your URL here (e.g., https://example.com)"
                                className="flex-1 px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all duration-300"
                                aria-label="Enter URL"
                            />
                            <button
                                type="button"
                                onClick={handleShortenUrl}
                                disabled={isLoading || !longUrl}
                                className="px-6 py-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-300"
                                aria-label="Shorten URL"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Link2 className="w-5 h-5" />}
                                Shorten
                            </button>
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        {shortenedUrl && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-3 p-4 bg-teal-50 rounded-lg border border-teal-200"
                            >
                                <a
                                    href={shortenedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 truncate flex-1 hover:underline"
                                    data-tooltip-id="short-url"
                                    data-tooltip-content={shortenedUrl}
                                >
                                    {shortenedUrl}
                                </a>
                                <Tooltip id="short-url" place="top" />
                                <button
                                    type="button"
                                    onClick={() => handleCopy(shortenedUrl)}
                                    className="p-2 text-gray-600 hover:bg-teal-100 rounded-full transition-colors duration-200"
                                    aria-label="Copy shortened URL"
                                    data-tooltip-id="copy-short-url"
                                    data-tooltip-content="Copy URL"
                                >
                                    <Copy className="w-4 h-4 text-blue-600" />
                                </button>
                                <Tooltip id="copy-short-url" place="top" />
                            </motion.div>
                        )}
                    </div>
                </motion.section>

                {/* URL History */}
                <motion.section
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="bg-white rounded-xl p-6 sm:p-8 shadow-lg border border-teal-100"
                >
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Shortened URLs</h2>
                    {urlHistory.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-6">No URLs shortened yet. Start by shortening a URL above!</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-100">
                            <table className="w-full text-sm text-gray-900">
                                <thead>
                                    <tr className="bg-teal-50 text-left text-gray-700">
                                        <th className="p-4 font-medium">Short URL</th>
                                        <th className="p-4 font-medium">Original URL</th>
                                        <th className="p-4 font-medium">Created</th>
                                        <th className="p-4 font-medium">Clicks</th>
                                        <th className="p-4 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {urlHistory.map((url, index) => (
                                            <motion.tr
                                                key={url._id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className={`border-t border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-teal-50 transition-colors duration-200`}
                                            >
                                                <td className="p-4">
                                                    <a
                                                        href={url.shortUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline truncate max-w-[150px] sm:max-w-[200px] block text-sm"
                                                        data-tooltip-id={`short-${url._id}`}
                                                        data-tooltip-content={url.shortUrl}
                                                    >
                                                        {url.shortUrl}
                                                    </a>
                                                    <Tooltip id={`short-${url._id}`} place="top" />
                                                </td>
                                                <td className="p-4">
                                                    <a
                                                        href={url.longUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-gray-600 hover:text-blue-600 hover:underline truncate max-w-[200px] sm:max-w-[300px] block text-sm"
                                                        data-tooltip-id={`long-${url._id}`}
                                                        data-tooltip-content={url.longUrl}
                                                    >
                                                        {url.longUrl}
                                                    </a>
                                                    <Tooltip id={`long-${url._id}`} place="top" />
                                                </td>
                                                <td className="p-4 text-sm">{new Date(url.createdAt).toLocaleDateString()}</td>
                                                <td className="p-4 text-sm">{url.clicks || 0}</td>
                                                <td className="p-4 flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(url.shortUrl)}
                                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-all duration-200"
                                                        aria-label="Copy short URL"
                                                        data-tooltip-id={`copy-${url._id}`}
                                                        data-tooltip-content="Copy"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    <Tooltip id={`copy-${url._id}`} place="top" />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(url._id)}
                                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-all duration-200"
                                                        aria-label="Delete URL"
                                                        data-tooltip-id={`delete-${url._id}`}
                                                        data-tooltip-content="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <Tooltip id={`delete-${url._id}`} place="top" />
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.section>
            </main>
        </motion.div>
    );
};

export default UrlShortener;