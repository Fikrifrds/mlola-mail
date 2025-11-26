import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Mail, Send, Users, FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const SendEmail = () => {
  const [templates, setTemplates] = useState([]);
  const [senders, setSenders] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSender, setSelectedSender] = useState(''); // Selected sender ID
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
      const items = Array.isArray(response.data?.templates)
        ? response.data.templates
        : [];
      setTemplates(items);
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

    if (recipients.some(r => r.email === newRecipient.email)) {
      toast.error('This email is already added');
      return;
    }

    setRecipients([...recipients, newRecipient]);
    setNewRecipient({ email: '', name: '' });
  };

  const removeRecipient = (email) => {
    setRecipients(recipients.filter(r => r.email !== email));
  };

  const addContactToRecipients = (contact) => {
    if (recipients.some(r => r.email === contact.email)) {
      toast.info('Contact already added to recipients');
      return;
    }
    setRecipients([...recipients, { email: contact.email, name: contact.name }]);
    toast.success(`Added ${contact.name} to recipients`);
  };

  const handleSendEmail = async () => {
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }
    // Either send with a template or with direct content
    if (!selectedTemplate) {
      if (!subject) {
        toast.error('Please enter a subject');
        return;
      }
      if (!htmlContent && !textContent) {
        toast.error('Please enter email content');
        return;
      }
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
        htmlContent: htmlContent,
        textContent: textContent,
        variables: {},
        senderAddressId: selectedSender || undefined,
      };

      const response = await api.post('/emails/send', emailData);

      toast.success(`Email sent successfully to ${recipients.length} recipients!`);

      // Reset form
      setRecipients([]);
      setSubject(''); // subject/html/text are used for preview only
      setHtmlContent('');
      setTextContent('');
      setSelectedTemplate('');

    } catch (error) {
      console.error('Failed to send email:', error);
      const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to send email';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Send Email</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create and send beautiful emails to your audience.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Email Content */}
        <div className="space-y-6">
          {/* Sender Selection */}
          {senders.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Sender Address
              </h3>
              <select
                value={selectedSender}
                onChange={(e) => setSelectedSender(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Use default sender</option>
                {senders.map((sender) => (
                  <option key={sender.id} value={sender.id}>
                    {sender.name} &lt;{sender.email}&gt; {sender.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Manage sender addresses in the <a href="/senders" className="text-blue-600 hover:underline">Senders page</a>
              </p>
            </div>
          )}

          {/* Template Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Choose Template (Optional)
            </h3>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">No template (custom email)</option>
              {Array.isArray(templates) && templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Email Subject
            </h3>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* HTML Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              HTML Content
            </h3>
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="Enter HTML content..."
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>

          {/* Text Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Text Content (Optional)
            </h3>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter plain text content..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Right Column - Recipients */}
        <div className="space-y-6">
          {/* Select from Contacts */}
          {contacts.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Select from Contacts
              </h3>
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts..."
                className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {contacts
                  .filter(c =>
                    !contactSearch ||
                    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                    c.email.toLowerCase().includes(contactSearch.toLowerCase())
                  )
                  .slice(0, 5)
                  .map((contact) => (
                    <div
                      key={contact.id}
                      className="flex justify-between items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">{contact.name}</div>
                        <div className="text-gray-600 dark:text-gray-400">{contact.email}</div>
                      </div>
                      <button
                        onClick={() => addContactToRecipients(contact)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Manage contacts in the <a href="/contacts" className="text-blue-600 hover:underline">Contacts page</a>
              </p>
            </div>
          )}

          {/* Add Recipients */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {contacts.length > 0 ? 'Or Add Manually' : 'Add Recipients'}
            </h3>
            <div className="space-y-3">
              <input
                type="email"
                value={newRecipient.email}
                onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                placeholder="Email address"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="text"
                value={newRecipient.name}
                onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                placeholder="Name (optional)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addRecipient}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Recipient
              </button>
            </div>
          </div>

          {/* Recipients List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recipients ({recipients.length})
            </h3>
            {recipients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No recipients added yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recipients.map((recipient, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {recipient.name || recipient.email}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {recipient.email}
                      </p>
                    </div>
                    <button
                      onClick={() => removeRecipient(recipient.email)}
                      className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendEmail}
            disabled={sending || recipients.length === 0}
            className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Email to {recipients.length} recipients
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendEmail;