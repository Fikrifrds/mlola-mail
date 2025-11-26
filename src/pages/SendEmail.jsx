import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Mail, Send, Users, FileText, Plus, Trash2, X, Search, Check } from 'lucide-react';
import { toast } from 'sonner';

const SendEmail = () => {
  const [templates, setTemplates] = useState([]);
  const [senders, setSenders] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSender, setSelectedSender] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [textContent, setTextContent] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [newRecipient, setNewRecipient] = useState({ email: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchSenders();
    fetchContacts();
  }, []);

  const fetchSenders = async () => {
    try {
      const response = await api.get('/sender-addresses');
      setSenders(response.data.senders || []);
    } catch (error) {
      console.error('Failed to fetch senders:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await api.get('/contacts');
      setContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/templates');
      setTemplates(response.data?.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateId) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setHtmlContent(template.html_content);
      setTextContent(template.text_content);
    } else {
      setSubject('');
      setHtmlContent('');
      setTextContent('');
    }
  };

  const addRecipient = () => {
    if (!newRecipient.email) {
      toast.error('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newRecipient.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (recipients.some(r => r.email === newRecipient.email)) {
      toast.error('This email is already added');
      return;
    }

    setRecipients([...recipients, newRecipient]);
    setNewRecipient({ email: '', name: '' });
    toast.success('Recipient added');
  };

  const removeRecipient = (email) => {
    setRecipients(recipients.filter(r => r.email !== email));
  };

  const addContactToRecipients = (contact) => {
    if (recipients.some(r => r.email === contact.email)) {
      toast.info('Contact already added');
      return;
    }
    setRecipients([...recipients, { email: contact.email, name: contact.name }]);
    toast.success(`Added ${contact.name || contact.email}`);
  };

  const handleSendEmail = async () => {
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    if (!selectedTemplate && !subject) {
      toast.error('Please enter a subject');
      return;
    }

    if (!selectedTemplate && !htmlContent && !textContent) {
      toast.error('Please enter email content');
      return;
    }

    try {
      setSending(true);

      const emailData = selectedTemplate ? {
        recipients,
        templateId: selectedTemplate,
        variables: {},
        senderAddressId: selectedSender || undefined,
      } : {
        recipients,
        subject,
        htmlContent,
        textContent,
        variables: {},
        senderAddressId: selectedSender || undefined,
      };

      await api.post('/emails/send', emailData);
      toast.success(`Email sent successfully to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}!`);

      // Reset form
      setRecipients([]);
      setSubject('');
      setHtmlContent('');
      setTextContent('');
      setSelectedTemplate('');
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error(error.response?.data?.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.email?.toLowerCase().includes(contactSearch.toLowerCase())
  );

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Send Email
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Compose and send beautiful emails to your recipients
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recipients Section - Left Side */}
        <div className="lg:col-span-1 space-y-6">
          {/* Add Recipients */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recipients</h3>
                <span className="ml-auto bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-medium px-2.5 py-0.5 rounded-full">
                  {recipients.length}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Add Recipient Form */}
              <div className="space-y-3">
                <input
                  type="email"
                  value={newRecipient.email}
                  onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                  placeholder="Email address"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  value={newRecipient.name}
                  onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                  placeholder="Name (optional)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={addRecipient}
                  className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Recipient
                </button>
              </div>

              {/* Quick Add from Contacts */}
              {contacts.length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Add</p>
                  </div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredContacts.slice(0, 10).map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => addContactToRecipients(contact)}
                        className="w-full flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {contact.name || contact.email}
                          </p>
                          {contact.name && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{contact.email}</p>
                          )}
                        </div>
                        <Plus className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipients List */}
              {recipients.length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Selected Recipients
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recipients.map((recipient) => (
                      <div
                        key={recipient.email}
                        className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {recipient.name || recipient.email}
                          </p>
                          {recipient.name && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{recipient.email}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeRecipient(recipient.email)}
                          className="ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Email Content Section - Right Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sender Selection */}
          {senders.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <Mail className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sender Address</h3>
                </div>
              </div>
              <div className="p-6">
                <select
                  value={selectedSender}
                  onChange={(e) => setSelectedSender(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Use default sender</option>
                  {senders.map((sender) => (
                    <option key={sender.id} value={sender.id}>
                      {sender.name} &lt;{sender.email}&gt; {sender.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Template Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Email Template</h3>
              </div>
            </div>
            <div className="p-6">
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">No template (compose manually)</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Select a template or compose your email manually below
              </p>
            </div>
          </div>

          {/* Email Content */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Email Content</h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter your email subject..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* HTML Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  HTML Content
                </label>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="<h1>Hello!</h1><p>Your email content here...</p>"
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
              </div>

              {/* Text Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Plain Text Content (Fallback)
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Plain text version of your email..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Fallback for email clients that don't support HTML
                </p>
              </div>
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSendEmail}
              disabled={sending || recipients.length === 0}
              className="flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Send className="w-6 h-6 mr-3" />
              {sending ? 'Sending...' : `Send to ${recipients.length} Recipient${recipients.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendEmail;