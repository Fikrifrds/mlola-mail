import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  BarChart3, 
  TrendingUp, 
  Mail, 
  Users, 
  Clock,
  Calendar,
  Filter
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, selectedTemplate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (dateRange) params.append('days', dateRange.replace('d', ''));
      if (selectedTemplate) params.append('templateId', selectedTemplate);

      const [overviewResponse, timeSeriesResponse, templatesResponse] = await Promise.all([
        api.get('/analytics/overview'),
        api.get(`/analytics/time-series?${params.toString()}`),
        api.get('/analytics/templates')
      ]);

      // Normalize backend responses to the shape expected by the UI
      const overviewData = overviewResponse?.data?.analytics || {};
      const totalSent = overviewData.totalSent || 0;
      const totalDelivered = overviewData.totalDelivered || 0;
      const totalBounced = overviewData.totalBounced || 0;
      const totalComplained = overviewData.totalComplained || 0;
      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

      const normalizedOverview = {
        // Keep snake_case keys used by the JSX
        total_sent: totalSent,
        total_delivered: totalDelivered,
        total_bounced: totalBounced,
        total_complained: totalComplained,
        delivery_rate: deliveryRate,
        open_rate: overviewData.openRate ?? 0,
        click_rate: overviewData.clickRate ?? 0,
      };

      const normalizedTimeSeries = timeSeriesResponse?.data?.timeSeries || [];

      const normalizedTemplates = (templatesResponse?.data?.templates || []).map(t => ({
        // Map backend keys to what the charts expect
        name: t.templateName || 'Unnamed',
        sent: t.sent || 0,
        opened: t.opened || 0,
        clicked: t.clicked || 0,
      }));

      setAnalytics({
        overview: normalizedOverview,
        timeSeries: normalizedTimeSeries,
        templates: normalizedTemplates,
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const StatCard = ({ title, value, rate, icon: Icon, color }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {rate !== undefined && (
            <p className={`text-sm mt-1 ${rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {rate >= 0 ? '+' : ''}{rate.toFixed(1)}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No analytics data available
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Start sending emails to see your analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your email campaign performance and engagement.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Sent"
          value={analytics.overview.total_sent}
          icon={Mail}
          color="bg-blue-500"
        />
        <StatCard
          title="Delivery Rate"
          value={`${analytics.overview.delivery_rate.toFixed(1)}%`}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatCard
          title="Open Rate"
          value={`${analytics.overview.open_rate.toFixed(1)}%`}
          icon={Users}
          color="bg-purple-500"
        />
        <StatCard
          title="Click Rate"
          value={`${analytics.overview.click_rate.toFixed(1)}%`}
          icon={BarChart3}
          color="bg-orange-500"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Time Series Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Email Activity Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#666"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #ccc',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sent" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Sent"
                />
                <Line 
                  type="monotone" 
                  dataKey="delivered" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Delivered"
                />
                <Line 
                  type="monotone" 
                  dataKey="opened" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Opened"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Engagement Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Email Status Breakdown
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Delivered', value: analytics.overview.total_delivered },
                    { name: 'Bounced', value: analytics.overview.total_bounced },
                    { name: 'Complained', value: analytics.overview.total_complained }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.overview.total_delivered > 0 && <Cell fill="#10b981" />}
                  {analytics.overview.total_bounced > 0 && <Cell fill="#ef4444" />}
                  {analytics.overview.total_complained > 0 && <Cell fill="#f59e0b" />}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Template Performance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Template Performance
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.templates}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="name" 
                stroke="#666"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#666" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #ccc',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="sent" fill="#3b82f6" name="Sent" />
              <Bar dataKey="opened" fill="#8b5cf6" name="Opened" />
              <Bar dataKey="clicked" fill="#10b981" name="Clicked" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;