import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const Unsubscribe = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('confirm'); // confirm, loading, success, error
    const [message, setMessage] = useState('');

    const handleUnsubscribe = async () => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid unsubscribe link');
            return;
        }

        setStatus('loading');
        try {
            await api.post('/tracking/unsubscribe', { token });
            setStatus('success');
        } catch (error) {
            console.error('Unsubscribe failed:', error);
            setStatus('error');
            setMessage(error.response?.data?.message || 'Failed to unsubscribe. Please try again.');
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Link</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        The unsubscribe link is invalid or missing a token.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                {status === 'confirm' && (
                    <>
                        <Mail className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Unsubscribe?</h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to unsubscribe from our emails? You won't receive any future updates or campaigns.
                        </p>
                        <button
                            onClick={handleUnsubscribe}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                        >
                            Yes, Unsubscribe Me
                        </button>
                    </>
                )}

                {status === 'loading' && (
                    <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Processing...</h1>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Unsubscribed</h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            You have been successfully unsubscribed. We're sorry to see you go!
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {message}
                        </p>
                        <button
                            onClick={() => setStatus('confirm')}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium"
                        >
                            Try Again
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default Unsubscribe;
