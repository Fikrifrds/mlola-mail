import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Mail, CheckCircle, XCircle, Clock, Send as SendIcon, Search, Eye, X, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';

const EmailHistory = () => {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);

    // Detail modal state
    const [detailModal, setDetailModal] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [emailDetail, setEmailDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Group members modal state
    const [groupMembersModal, setGroupMembersModal] = useState(false);
    const [groupMembers, setGroupMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, [page, statusFilter]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
            });
            if (statusFilter) {
                params.append('status', statusFilter);
            }
            const response = await api.get(`/emails/history?${params}`);
            setEmails(response.data.emails || []);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Failed to fetch email history:', error);
            toast.error('Failed to load email history');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (email) => {
        setSelectedEmail(email);
        setDetailModal(true);
        setDetailLoading(true);
        try {
            const response = await api.get(`/emails/${email.id}`);
            setEmailDetail(response.data.email);
        } catch (error) {
            console.error('Failed to fetch email details:', error);
            toast.error('Failed to load email details');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleViewGroupMembers = async (groupId) => {
        setMembersLoading(true);
        setGroupMembersModal(true);
        try {
            const response = await api.get(`/groups/${groupId}/members`);
            setGroupMembers(response.data.members || []);
        } catch (error) {
            console.error('Failed to fetch group members:', error);
            toast.error('Failed to load group members');
        } finally {
            setMembersLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'sent':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'failed':
                return <XCircle className="w-5 h-5 text-red-500" />;
            case 'pending':
                return <Clock className="w-5 h-5 text-yellow-500" />;
            default:
                return <Mail className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusBadge = (status) => {
        const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
        switch (status) {
            case 'sent':
                return <span className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`}>Sent</span>;
            case 'failed':
                return <span className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`}>Failed</span>;
            case 'pending':
                return <span className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`}>Pending</span>;
            default:
                return <span className={`${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`}>{status}</span>;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const parseRecipients = (recipientsString) => {
        try {
            const parsed = typeof recipientsString === 'string' ? JSON.parse(recipientsString) : recipientsString;
            if (Array.isArray(parsed)) {
                return parsed.map(r => {
                    if (typeof r === 'string') return r;
                    if (typeof r === 'object' && r !== null) {
                        return r.email || r.name || JSON.stringify(r);
                    }
                    return String(r);
                }).join(', ');
            }
            return String(recipientsString);
        } catch {
            return String(recipientsString);
        }
    };

    const renderRecipientCell = (email) => {
        // If email is from a campaign, show group name
        if (email.campaign && email.group) {
            return (
                <button
                    onClick={() => handleViewGroupMembers(email.group.id)}
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                    <UsersIcon className="w-4 h-4" />
                    {email.group.name}
                </button>
            );
        }
        // Otherwise show recipients
        return (
            <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                {parseRecipients(email.recipients)}
            </div>
        );
    };

    if (loading && emails.length === 0) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email History</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    View all sent emails and their delivery status
                </p>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Filter by Status
                    </label>
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        className="w-full md:w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="">All Statuses</option>
                        <option value="sent">Sent</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>
            </div>

            {emails.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                    <SendIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No emails found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        {statusFilter ? 'Try changing the filter' : 'You haven\'t sent any emails yet'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Subject
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Recipient/Group
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Sent At
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {emails.map((email) => (
                                        <tr key={email.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {email.campaign && (
                                                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-medium rounded">
                                                            Campaign
                                                        </span>
                                                    )}
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {email.campaign?.name || email.template?.subject || 'No subject'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {renderRecipientCell(email)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(email.status)}
                                                    {getStatusBadge(email.status)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                                    {formatDate(email.sent_at || email.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => handleViewDetails(email)}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 inline-flex items-center gap-1"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.pages > 1 && (
                        <div className="mt-6 flex justify-between items-center">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Page {pagination.page} of {pagination.pages}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                    disabled={page === pagination.pages}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Detail Modal */}
            {detailModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Email Details
                            </h2>
                            <button
                                onClick={() => setDetailModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {detailLoading ? (
                            <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>
                        ) : emailDetail ? (
                            <div className="space-y-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(emailDetail.status)}
                                            {getStatusBadge(emailDetail.status)}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sent At</label>
                                        <div className="text-sm text-gray-900 dark:text-white">
                                            {formatDate(emailDetail.sent_at || emailDetail.created_at)}
                                        </div>
                                    </div>
                                </div>

                                {/* Campaign & Group */}
                                {emailDetail.campaign && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign</label>
                                        <div className="text-sm text-gray-900 dark:text-white">
                                            {emailDetail.campaign.name}
                                            {emailDetail.group && (
                                                <span className="ml-2 text-gray-500">
                                                    → Group: {emailDetail.group.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Recipients */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recipients</label>
                                    <div className="text-sm text-gray-900 dark:text-white">
                                        {parseRecipients(emailDetail.recipients)}
                                    </div>
                                </div>

                                {/* Subject */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                                    <div className="text-sm text-gray-900 dark:text-white">
                                        {emailDetail.campaign?.subject || emailDetail.template?.subject || 'No subject'}
                                    </div>
                                </div>

                                {/* Content Preview */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content Preview</label>
                                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 max-h-96 overflow-y-auto">
                                        <div
                                            className="prose dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{
                                                __html: emailDetail.campaign?.html_content ||
                                                    emailDetail.template?.html_content ||
                                                    '<p>No content available</p>'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Events */}
                                {emailDetail.events && emailDetail.events.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Events</label>
                                        <div className="space-y-2">
                                            {emailDetail.events.map((event, idx) => (
                                                <div key={idx} className="flex justify-between text-sm">
                                                    <span className="text-gray-900 dark:text-white">{event.event_type}</span>
                                                    <span className="text-gray-500 dark:text-gray-400">{formatDate(event.occurred_at)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Group Members Modal */}
            {groupMembersModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Group Recipients
                            </h2>
                            <button
                                onClick={() => setGroupMembersModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {membersLoading ? (
                            <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>
                        ) : (
                            <div className="flex-1 overflow-y-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {groupMembers.map((member) => (
                                            <tr key={member.id}>
                                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{member.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{member.email}</td>
                                            </tr>
                                        ))}
                                        {groupMembers.length === 0 && (
                                            <tr>
                                                <td colSpan="2" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                    No members found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailHistory;
