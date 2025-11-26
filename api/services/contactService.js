import { db } from '../config/database.js';

/**
 * Get all contacts for a user
 */
export const getUserContacts = async (userId, filters = {}) => {
    let query = db
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name', { ascending: true });

    // Apply filters if provided
    if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
    }

    const { data: contacts, error } = await query.execute();

    if (error) {
        throw new Error(`Failed to fetch contacts: ${error.message}`);
    }

    return contacts || [];
};

/**
 * Search contacts by name or email
 */
export const searchContacts = async (userId, searchQuery) => {
    const { data: contacts, error } = await db
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .order('name', { ascending: true })
        .execute();

    if (error) {
        throw new Error(`Failed to search contacts: ${error.message}`);
    }

    return contacts || [];
};

/**
 * Get contact by ID
 */
export const getContactById = async (id, userId) => {
    const { data: contact, error } = await db
        .from('contacts')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()
        .execute();

    if (error) {
        throw new Error(`Failed to fetch contact: ${error.message}`);
    }

    return contact;
};

/**
 * Create new contact
 */
export const createContact = async (userId, contactData) => {
    const { email, name, notes, tags } = contactData;

    const { data: contact, error } = await db
        .from('contacts')
        .insert({
            user_id: userId,
            email,
            name,
            notes: notes || null,
            tags: tags || [],
            is_active: true,
        })
        .select()
        .single()
        .execute();

    if (error) {
        throw new Error(`Failed to create contact: ${error.message}`);
    }

    return contact;
};

/**
 * Update contact
 */
export const updateContact = async (id, userId, updates) => {
    const { email, name, notes, tags, isActive } = updates;

    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (notes !== undefined) updateData.notes = notes;
    if (tags !== undefined) updateData.tags = tags;
    if (isActive !== undefined) updateData.is_active = isActive;
    updateData.updated_at = new Date().toISOString();

    const { data: contact, error } = await db
        .from('contacts')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()
        .execute();

    if (error) {
        throw new Error(`Failed to update contact: ${error.message}`);
    }

    return contact;
};

/**
 * Delete contact
 */
export const deleteContact = async (id, userId) => {
    const { error } = await db
        .from('contacts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .execute();

    if (error) {
        throw new Error(`Failed to delete contact: ${error.message}`);
    }
};

/**
 * Bulk create contacts
 */
export const bulkCreateContacts = async (userId, contacts) => {
    const contactsToInsert = contacts.map(c => ({
        user_id: userId,
        email: c.email,
        name: c.name,
        notes: c.notes || null,
        tags: c.tags || [],
        is_active: true,
    }));

    const { data, error } = await db
        .from('contacts')
        .insert(contactsToInsert)
        .select()
        .execute();

    if (error) {
        throw new Error(`Failed to bulk create contacts: ${error.message}`);
    }

    return data || [];
};

/**
 * Bulk delete contacts
 */
export const bulkDeleteContacts = async (userId, contactIds) => {
    const { error } = await db
        .from('contacts')
        .delete()
        .eq('user_id', userId)
        .in('id', contactIds)
        .execute();

    if (error) {
        throw new Error(`Failed to bulk delete contacts: ${error.message}`);
    }
};
