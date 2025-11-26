import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Mail, Send, Users, TrendingUp, CheckCircle, Clock, AlertCircle, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEmails: 0,
    sentToday: 0,
    totalRecipients: 0,
    successRate: 0,
    recentEmails: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch email history
      const response = await api.get('/emails/history?limit=5');
      const emails = response.data.emails || [];

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sentToday = emails.filter(e => {
        const emailDate = new Date(e.created_at);
        return emailDate >= today;
      }).length;

      const successful = emails.filter(e => e.status === 'sent').length;
      const successRate = emails.length > 0 ? Math.round((successful / emails.length) * 100) : 0;

      // Count unique recipients
      const recipients = new Set();
      emails.forEach(email => {
        try {
          const parsed = JSON.parse(email.recipients);
          if (Array.isArray(parsed)) {
            parsed.forEach(r => recipients.add(r.email || r));
          }
        } catch (e) { }
      });

      setStats({
        totalEmails: emails.length,
        sentToday,
        totalRecipients: recipients.size,
        successRate,
        recentEmails: emails.slice(0, 5),
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, gradient, trend, trendValue }) => (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className={`absolute inset-0 opacity-5 ${gradient}`}></div>
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${gradient} bg-opacity-10`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className="flex items-center text-green-600 dark:text-green-400">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-sm font-medium ml-1">{trendValue}%</span>
            </div>
          )}
        </div>
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome back! Here's your email service overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Emails"
          value={stats.totalEmails}
          icon={Mail}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          trend
          trendValue="12"
        />
        <StatCard
          title="Sent Today"
          value={stats.sentToday}
          icon={Send}
          gradient="bg-gradient-to-br from-green-500 to-green-600"
          trend
          trendValue="8"
        />
        <StatCard
          title="Total Recipients"
          value={stats.totalRecipients}
          icon={Users}
          gradient="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <StatCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-orange-500 to-orange-600"
          trend
          trendValue="5"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Your latest email campaigns</p>
        </div>

        {stats.recentEmails.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No emails yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start sending emails to see your activity here
            </p>
            <a
              href="/send"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Your First Email
            </a>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {stats.recentEmails.map((email) => (
              <div
                key={email.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                        {email.status}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(email.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {email.template?.name || email.template?.subject || 'Direct Email'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      Recipients: {(() => {
                        try {
                          const recipients = typeof email.recipients === 'string'
                            ? JSON.parse(email.recipients)
                            : email.recipients;
                          return Array.isArray(recipients) ? recipients.length : 0;
                        } catch {
                          return 0;
                        }
                      })()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {email.status === 'sent' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : email.status === 'failed' ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {stats.recentEmails.length > 0 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 text-center">
            <a
              href="/history"
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              View All History →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;