import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Edit, Trash2, Building2, X, Star, Globe, Image } from 'lucide-react';
import { toast } from 'sonner';

const Brands = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        logo_url: '',
        website: '',
        is_default: false
    });

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        try {
            setLoading(true);
            const response = await api.get('/brands');
            setBrands(response.data?.brands || []);
        } catch (error) {
            console.error('Failed to fetch brands:', error);
            toast.error('Failed to load brands');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name) {
            toast.error('Please enter a brand name');
            return;
        }

        try {
            const payload = {
                name: formData.name,
                logoUrl: formData.logo_url || '',
                website: formData.website || '',
                isDefault: formData.is_default || false
            };

            if (editingBrand) {
                await api.put(`/brands/${editingBrand.id}`, payload);
                toast.success('Brand updated successfully');
            } else {
                await api.post('/brands', payload);
                toast.success('Brand created successfully');
            }

            setShowModal(false);
            setEditingBrand(null);
            setFormData({ name: '', logo_url: '', website: '', is_default: false });
            fetchBrands();
        } catch (error) {
            console.error('Brand error:', error);
            toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to save brand');
        }
    };

    const handleEdit = (brand) => {
        setEditingBrand(brand);
        setFormData({
            name: brand.name,
            logo_url: brand.logo_url || '',
            website: brand.website || '',
            is_default: brand.is_default || false
        });
        setShowModal(true);
    };

    const handleDelete = async (brandId) => {
        if (!confirm('Are you sure you want to delete this brand?')) {
            return;
        }

        try {
            await api.delete(`/brands/${brandId}`);
            toast.success('Brand deleted successfully');
            fetchBrands();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete brand');
        }
    };

    const openModal = () => {
        setEditingBrand(null);
        setFormData({ name: '', logo_url: '', website: '', is_default: false });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingBrand(null);
        setFormData({ name: '', logo_url: '', website: '', is_default: false });
    };

    if (loading) {
        return (
            <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    Brands
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Manage your company brands for use in email templates
                </p>
            </div>

            {/* Action Button */}
            <div className="mb-6">
                <button
                    onClick={openModal}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 font-medium"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Brand
                </button>
            </div>

            {/* Brands Grid */}
            {brands.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
                    <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        No brands yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Create your first brand to use in email templates
                    </p>
                    <button
                        onClick={openModal}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium mx-auto"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Create Brand
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {brands.map((brand) => (
                        <div key={brand.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                            <div className="p-6">
                                {/* Logo */}
                                {brand.logo_url ? (
                                    <div className="w-16 h-16 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                                        <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 mb-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                                        <Building2 className="w-8 h-8 text-white" />
                                    </div>
                                )}

                                {/* Brand Info */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                                {brand.name}
                                            </h3>
                                            {brand.is_default && (
                                                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 text-xs font-medium rounded-full flex items-center">
                                                    <Star className="w-3 h-3 mr-1" />
                                                    Default
                                                </span>
                                            )}
                                        </div>
                                        {brand.website && (
                                            <a
                                                href={brand.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                                            >
                                                <Globe className="w-3 h-3 mr-1" />
                                                {brand.website}
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        <p>Updated {new Date(brand.updated_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(brand)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="Edit Brand"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(brand.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete Brand"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {editingBrand ? 'Edit Brand' : 'Create New Brand'}
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Brand Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    placeholder="e.g., Acme Corp"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Logo URL
                                </label>
                                <div className="relative">
                                    <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="url"
                                        value={formData.logo_url}
                                        onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="https://example.com/logo.png"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Website
                                </label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="url"
                                        value={formData.website}
                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="https://example.com"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="is_default"
                                    checked={formData.is_default}
                                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="is_default" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                    Set as default brand
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 font-medium"
                                >
                                    {editingBrand ? 'Update Brand' : 'Create Brand'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Brands;
