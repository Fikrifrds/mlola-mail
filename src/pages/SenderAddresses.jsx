import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Mail, Plus, Trash2, Star, StarOff, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const SenderAddresses = () => {
    const [senders, setSenders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSender, setEditingSender] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        smtpPassword: '',
        isDefault: false,
    });

    useEffect(() => {
        fetchSenders();
    }, []);

    const fetchSenders = async () => {
        try {
            setLoading(true);
            const response = await api.get('/sender-addresses');
            setSenders(response.data.senders || []);
        } catch (error) {
            console.error('Failed to fetch senders:', error);
            toast.error('Failed to load sender addresses');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingSender(null);
        setFormData({ email: '', name: '', smtpPassword: '', isDefault: false });
        setShowModal(true);
    };

    const handleEdit = (sender) => {
        setEditingSender(sender);
        setFormData({
            email: sender.email,
            name: sender.name,
            smtpPassword: '', // Don't show existing password
            isDefault: sender.isDefault,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSender) {
                // Update existing - only send password if it's changed
                const updateData = { ...formData };
                if (!updateData.smtpPassword) {
                    delete updateData.smtpPassword;
                }
                await api.put(`/sender-addresses/${editingSender.id}`, updateData);
                toast.success('Sender updated successfully');
            } else {
                // Create new
                await api.post('/sender-addresses', formData);
                toast.success('Sender created successfully');
            }
            setShowModal(false);
            fetchSenders();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save sender');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this sender address?')) {
            return;
        }
        try {
            await api.delete(`/sender-addresses/${id}`);
            toast.success('Sender deleted successfully');
            fetchSenders();
        } catch (error) {
            toast.error('Failed to delete sender');
        }
    };

    const handleSetDefault = async (id) => {
        try {
            await api.put(`/sender-addresses/${id}/set-default`);
            toast.success('Default sender updated');
            fetchSenders();
        } catch (error) {
            toast.error('Failed to set default sender');
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sender Addresses</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Manage your email sender addresses and SMTP credentials
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Sender
                </button>
            </div>

            {senders.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                    <Mail className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No sender addresses yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Add your first sender address to start sending emails with custom credentials
                    </p>
                    <button
                        onClick={handleCreate}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Sender
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Sender
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Default
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {senders.map((sender) => (
                                <tr key={sender.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {sender.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {sender.email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button
                                            onClick={() => !sender.isDefault && handleSetDefault(sender.id)}
                                            className={`p-1 rounded ${sender.isDefault
                                                    ? 'text-yellow-500'
                                                    : 'text-gray-400 hover:text-yellow-500'
                                                }`}
                                            title={sender.isDefault ? 'Default sender' : 'Set as default'}
                                        >
                                            {sender.isDefault ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(sender)}
                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 mr-4"
                                        >
                                            <Edit2 className="w-4 h-4 inline" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(sender.id)}
                                            className="text-red-600 hover:text-red-900 dark:text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4 inline" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingSender ? 'Edit Sender' : 'Add Sender'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Sender Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Fikri Firdaus"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="support@mlola.com"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    This email will also be used as SMTP username
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    SMTP Password
                                </label>
                                <input
                                    type="password"
                                    value={formData.smtpPassword}
                                    onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                                    placeholder={editingSender ? 'Leave blank to keep current password' : 'Enter SMTP password'}
                                    required={!editingSender}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Get this from Alibaba Cloud Direct Mail console
                                </p>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isDefault"
                                    checked={formData.isDefault}
                                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                    Set as default sender
                                </label>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {editingSender ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SenderAddresses;
