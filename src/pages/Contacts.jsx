import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Users, Plus, Trash2, Edit2, Save, X, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import CsvUploader from '../components/CsvUploader';

const Contacts = () => {
    const [contacts, setContacts] = useState([]);
    const [filteredContacts, setFilteredContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        notes: '',
        tags: [],
    });

    useEffect(() => {
        fetchContacts();
    }, []);

    useEffect(() => {
        // Filter contacts based on search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const filtered = contacts.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query)
            );
            setFilteredContacts(filtered);
        } else {
            setFilteredContacts(contacts);
        }
    }, [searchQuery, contacts]);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/contacts');
            setContacts(response.data.contacts || []);
            setFilteredContacts(response.data.contacts || []);
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
            toast.error('Failed to load contacts');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingContact(null);
        setFormData({ email: '', name: '', notes: '', tags: [] });
        setShowModal(true);
    };

    const handleEdit = (contact) => {
        setEditingContact(contact);
        setFormData({
            email: contact.email,
            name: contact.name,
            notes: contact.notes || '',
            tags: contact.tags || [],
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingContact) {
                await api.put(`/contacts/${editingContact.id}`, formData);
                toast.success('Contact updated successfully');
            } else {
                await api.post('/contacts', formData);
                toast.success('Contact created successfully');
            }
            setShowModal(false);
            fetchContacts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save contact');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this contact?')) {
            return;
        }
        try {
            await api.delete(`/contacts/${id}`);
            toast.success('Contact deleted successfully');
            fetchContacts();
        } catch (error) {
            toast.error('Failed to delete contact');
        }
    };

    const handleBulkUpload = async (newContacts) => {
        try {
            // Process in chunks of 100 to avoid payload limits
            const chunkSize = 100;
            const chunks = [];
            for (let i = 0; i < newContacts.length; i += chunkSize) {
                chunks.push(newContacts.slice(i, i + chunkSize));
            }

            let successCount = 0;
            for (const chunk of chunks) {
                const response = await api.post('/contacts/bulk', { contacts: chunk });
                successCount += response.data.count || 0;
            }

            toast.success(`Successfully imported ${successCount} contacts`);
            fetchContacts();
        } catch (error) {
            console.error('Bulk upload failed:', error);
            toast.error('Failed to import contacts');
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
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contacts</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Manage your email recipients and contacts
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Import CSV
                    </button>
                    <button
                        onClick={handleCreate}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Contact
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search contacts by name or email..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            {filteredContacts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                    <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {searchQuery ? 'No contacts found' : 'No contacts yet'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {searchQuery
                            ? 'Try a different search term'
                            : 'Add your first contact to quickly select recipients when sending emails'
                        }
                    </p>
                    {!searchQuery && (
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Import CSV
                            </button>
                            <button
                                onClick={handleCreate}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Contact
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Notes
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredContacts.map((contact) => (
                                <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {contact.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {contact.email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                                            {contact.notes || '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(contact)}
                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 mr-4"
                                        >
                                            <Edit2 className="w-4 h-4 inline" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(contact.id)}
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
                                {editingContact ? 'Edit Contact' : 'Add Contact'}
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
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
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
                                    placeholder="john@example.com"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Additional information about this contact"
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
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
                                    {editingContact ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import CSV Modal */}
            {showImportModal && (
                <CsvUploader
                    onUpload={handleBulkUpload}
                    onClose={() => setShowImportModal(false)}
                />
            )}
        </div>
    );
};

export default Contacts;
