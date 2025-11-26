import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Mail, Plus, Calendar, Send, FileText, Users, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Campaigns = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form state
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        groupId: '',
        templateId: '',
    });

    // Selection data
    const [groups, setGroups] = useState([]);
    const [templates, setTemplates] = useState([]);

    useEffect(() => {
        fetchCampaigns();
        fetchGroups();
        fetchTemplates();
    }, []);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const response = await api.get('/campaigns');
            setCampaigns(response.data.campaigns || []);
        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
            toast.error('Failed to load campaigns');
        } finally {
            setLoading(false);
        }
    };

    const fetchGroups = async () => {
        try {
            const response = await api.get('/groups');
            setGroups(response.data.groups || []);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const response = await api.get('/templates');
            setTemplates(response.data.templates || []);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        }
    };

    const handleCreate = () => {
        setStep(1);
        setFormData({ name: '', subject: '', groupId: '', templateId: '' });
        setShowCreateModal(true);
    };

    const handleSend = async (campaignId) => {
        if (!confirm('Are you sure you want to send this campaign now?')) return;
        try {
            await api.post(`/campaigns/${campaignId}/send`);
            toast.success('Campaign sending started');
            fetchCampaigns();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send campaign');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/campaigns', formData);
            toast.success('Campaign created successfully');
            setShowCreateModal(false);
            fetchCampaigns();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create campaign');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'sending': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'scheduled': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4 mr-1" />;
            case 'sending': return <Send className="w-4 h-4 mr-1" />;
            case 'scheduled': return <Calendar className="w-4 h-4 mr-1" />;
            case 'failed': return <AlertCircle className="w-4 h-4 mr-1" />;
            default: return <FileText className="w-4 h-4 mr-1" />;
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
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Create and manage your email campaigns
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Campaign
                </button>
            </div>

            {campaigns.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                    <Mail className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No campaigns yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Create your first campaign to reach your audience.
                    </p>
                    <button
                        onClick={handleCreate}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Campaign
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Campaign Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Audience
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Stats
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {campaigns.map((campaign) => (
                                <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {campaign.name}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {campaign.subject}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                                            {getStatusIcon(campaign.status)}
                                            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {campaign.group_name || 'No Group'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {campaign.status === 'completed' ? (
                                            <div>
                                                <div className="text-green-600">{campaign.successful_sends} Sent</div>
                                                {campaign.failed_sends > 0 && (
                                                    <div className="text-red-600">{campaign.failed_sends} Failed</div>
                                                )}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {campaign.status === 'draft' && (
                                            <button
                                                onClick={() => handleSend(campaign.id)}
                                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 flex items-center justify-end w-full"
                                            >
                                                <Send className="w-4 h-4 mr-1" />
                                                Send Now
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Campaign Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Create New Campaign
                            </h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Campaign Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. June Newsletter"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email Subject
                                </label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    placeholder="Subject line for your email"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Target Audience (Group)
                                </label>
                                <select
                                    value={formData.groupId}
                                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Select a group...</option>
                                    {groups.map(group => (
                                        <option key={group.id} value={group.id}>{group.name} ({group.member_count} members)</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email Template
                                </label>
                                <select
                                    value={formData.templateId}
                                    onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Select a template...</option>
                                    {templates.map(template => (
                                        <option key={template.id} value={template.id}>{template.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Create Draft
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Campaigns;
