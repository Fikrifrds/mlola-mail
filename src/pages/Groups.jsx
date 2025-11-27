import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Users, Plus, Trash2, Edit2, Save, X, Search, UserPlus, Check } from 'lucide-react';
import { toast } from 'sonner';

const Groups = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [viewMembersModal, setViewMembersModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    // Members management state
    const [contacts, setContacts] = useState([]);
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [groupMembers, setGroupMembers] = useState([]);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            setLoading(true);
            const response = await api.get('/groups');
            setGroups(response.data.groups || []);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
            toast.error('Failed to load groups');
        } finally {
            setLoading(false);
        }
    };

    const fetchContacts = async () => {
        try {
            const response = await api.get('/contacts');
            setContacts(response.data.contacts || []);
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
            toast.error('Failed to load contacts');
        }
    };

    const handleCreate = () => {
        setEditingGroup(null);
        setFormData({ name: '', description: '' });
        setShowModal(true);
    };

    const handleEdit = (group) => {
        setEditingGroup(group);
        setFormData({
            name: group.name,
            description: group.description || '',
        });
        setShowModal(true);
    };

    const handleManageMembers = async (group) => {
        setSelectedGroup(group);
        await fetchContacts();
        // Ideally we should fetch current members of the group here to pre-select them
        // For now, we'll just show the add members modal
        // A real implementation would need an endpoint to get group members
        setSelectedContacts([]);
        setShowMembersModal(true);
    };

    const handleViewMembers = async (group) => {
        setSelectedGroup(group);
        try {
            const response = await api.get(`/groups/${group.id}/members`);
            setGroupMembers(response.data.members || []);
            setViewMembersModal(true);
        } catch (error) {
            console.error('Failed to fetch group members:', error);
            toast.error('Failed to load group members');
        }
    };

    const handleRemoveMember = async (contactId) => {
        if (!confirm('Are you sure you want to remove this member?')) return;
        try {
            await api.delete(`/groups/${selectedGroup.id}/members/${contactId}`);
            toast.success('Member removed successfully');
            // Refresh members list
            const response = await api.get(`/groups/${selectedGroup.id}/members`);
            setGroupMembers(response.data.members || []);
            fetchGroups(); // Refresh group count
        } catch (error) {
            toast.error('Failed to remove member');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingGroup) {
                await api.put(`/groups/${editingGroup.id}`, formData);
                toast.success('Group updated successfully');
            } else {
                await api.post('/groups', formData);
                toast.success('Group created successfully');
            }
            setShowModal(false);
            fetchGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save group');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this group?')) {
            return;
        }
        try {
            await api.delete(`/groups/${id}`);
            toast.success('Group deleted successfully');
            fetchGroups();
        } catch (error) {
            toast.error('Failed to delete group');
        }
    };

    const toggleSelectAll = () => {
        const availableContactIds = filteredContacts.map(c => c.id);
        if (selectedContacts.length === availableContactIds.length) {
            // Deselect all
            setSelectedContacts([]);
        } else {
            // Select all visible contacts
            setSelectedContacts(availableContactIds);
        }
    };

    const handleAddMembers = async () => {
        if (selectedContacts.length === 0) {
            toast.error('Please select at least one contact');
            return;
        }

        try {
            await api.post(`/groups/${selectedGroup.id}/members`, {
                contactIds: selectedContacts,
            });
            toast.success('Members added successfully');
            setShowMembersModal(false);
            setSelectedContacts([]);
            // Assuming fetchGroupMembers is a function that fetches members for a specific group
            // and viewMembersModal holds the ID of the group whose members are currently being viewed
            // if (selectedGroup.id === viewMembersModal) {
            //     fetchGroupMembers(selectedGroup.id);
            // }
            fetchGroups(); // Refresh to update member count
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add members');
        }
    };

    const toggleContactSelection = (contactId) => {
        setSelectedContacts(prev =>
            prev.includes(contactId)
                ? prev.filter(id => id !== contactId)
                : [...prev, contactId]
        );
    };

    const filteredContacts = contacts.filter(c =>
        c.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
    );

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
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Groups</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Organize your contacts into audiences for targeted campaigns
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group
                </button>
            </div>

            {groups.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                    <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No groups yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Create your first group to start organizing your contacts.
                    </p>
                    <button
                        onClick={handleCreate}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Group
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map((group) => (
                        <div key={group.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {group.name}
                                    </h3>
                                    <button
                                        onClick={() => handleViewMembers(group)}
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 flex items-center"
                                    >
                                        <Users className="w-3 h-3 mr-1" />
                                        {group.member_count} members
                                    </button>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleEdit(group)}
                                        className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(group.id)}
                                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                                {group.description || 'No description'}
                            </p>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleManageMembers(group)}
                                    className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Add Members
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Group Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingGroup ? 'Edit Group' : 'Create Group'}
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
                                    Group Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Newsletter Subscribers"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="What is this group for?"
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
                                    {editingGroup ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Members Modal */}
            {showMembersModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Add Members to {selectedGroup?.name}
                            </h2>
                            <button
                                onClick={() => setShowMembersModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={memberSearchQuery}
                                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                                    placeholder="Search contacts..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                                            <div
                                                className="flex items-center gap-2 cursor-pointer"
                                                onClick={toggleSelectAll}
                                            >
                                                <div className={`w-5 h-5 border rounded flex items-center justify-center ${selectedContacts.length === filteredContacts.length && filteredContacts.length > 0
                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                        : selectedContacts.length > 0
                                                            ? 'bg-blue-300 border-blue-300 text-white'
                                                            : 'border-gray-300 dark:border-gray-600'
                                                    }`}>
                                                    {selectedContacts.length > 0 && <Check className="w-3 h-3" />}
                                                </div>
                                                <span className="text-xs">All</span>
                                            </div>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Email
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredContacts.map((contact) => (
                                        <tr
                                            key={contact.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                            onClick={() => toggleContactSelection(contact.id)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={`w-5 h-5 border rounded flex items-center justify-center ${selectedContacts.includes(contact.id)
                                                    ? 'bg-blue-600 border-blue-600 text-white'
                                                    : 'border-gray-300 dark:border-gray-600'
                                                    }`}>
                                                    {selectedContacts.includes(contact.id) && <Check className="w-3 h-3" />}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {contact.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {contact.email}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {selectedContacts.length} contacts selected
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowMembersModal(false)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddMembers}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Add Selected Members
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Members Modal */}
            {viewMembersModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {selectedGroup?.name} Members
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {groupMembers.length} members
                                </p>
                            </div>
                            <button
                                onClick={() => setViewMembersModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Joined
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {groupMembers.map((member) => (
                                        <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {member.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {member.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(member.joined_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {groupMembers.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                No members in this group yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setViewMembersModal(false)}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Groups;
