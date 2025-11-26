import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, X, Check, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

const REQUIRED_FIELDS = ['email'];
const OPTIONAL_FIELDS = ['name', 'tags', 'notes'];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const CsvUploader = ({ onUpload, onClose }) => {
    const [step, setStep] = useState('upload'); // upload, map, preview, uploading
    const [file, setFile] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [data, setData] = useState([]);
    const [mapping, setMapping] = useState({});
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
                toast.error('Please upload a valid CSV file');
                return;
            }
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = (file) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data.length === 0) {
                    toast.error('CSV file is empty');
                    return;
                }
                setHeaders(results.meta.fields || []);
                setData(results.data);

                // Auto-map fields
                const initialMapping = {};
                const lowerHeaders = results.meta.fields.map(h => h.toLowerCase());

                ALL_FIELDS.forEach(field => {
                    const index = lowerHeaders.findIndex(h => h.includes(field));
                    if (index !== -1) {
                        initialMapping[field] = results.meta.fields[index];
                    }
                });

                setMapping(initialMapping);
                setStep('map');
            },
            error: (error) => {
                console.error('CSV Parse Error:', error);
                toast.error('Failed to parse CSV file');
            }
        });
    };

    const handleMappingChange = (field, header) => {
        setMapping(prev => ({ ...prev, [field]: header }));
    };

    const handleImport = async () => {
        if (!mapping.email) {
            toast.error('Please map the Email field');
            return;
        }

        setUploading(true);
        try {
            // Transform data based on mapping
            const contacts = data.map(row => {
                const contact = {
                    email: row[mapping.email],
                    name: mapping.name ? row[mapping.name] : '',
                    notes: mapping.notes ? row[mapping.notes] : '',
                    tags: []
                };

                if (mapping.tags && row[mapping.tags]) {
                    // Split tags by comma if they exist
                    contact.tags = row[mapping.tags].split(',').map(t => t.trim()).filter(Boolean);
                }

                return contact;
            }).filter(c => c.email); // Ensure email exists

            await onUpload(contacts);
            onClose();
        } catch (error) {
            console.error('Import failed:', error);
            // Error handling is done in parent
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Contacts</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {step === 'upload' && (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Drag and drop your CSV file here, or click to browse
                        </p>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="csv-upload"
                        />
                        <label
                            htmlFor="csv-upload"
                            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg cursor-pointer transition-colors"
                        >
                            Select CSV File
                        </label>
                        <p className="text-xs text-gray-500 mt-4">
                            Supported columns: Email, Name, Tags, Notes
                        </p>
                    </div>
                )}

                {step === 'map' && (
                    <div>
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{file?.name}</p>
                                    <p className="text-sm text-gray-500">{data.length} contacts found</p>
                                </div>
                            </div>

                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Map Columns</h3>
                            <div className="space-y-4">
                                {ALL_FIELDS.map(field => (
                                    <div key={field} className="grid grid-cols-3 gap-4 items-center">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                            {field} {REQUIRED_FIELDS.includes(field) && <span className="text-red-500">*</span>}
                                        </label>
                                        <div className="col-span-2">
                                            <select
                                                value={mapping[field] || ''}
                                                onChange={(e) => handleMappingChange(field, e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                <option value="">-- Select Column --</option>
                                                {headers.map(header => (
                                                    <option key={header} value={header}>{header}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setStep('upload')}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={uploading || !mapping.email}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Import Contacts
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CsvUploader;
