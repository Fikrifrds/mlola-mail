import { db } from '../config/database.js';

/**
 * Get all sender addresses for a user
 */
export const getUserSenders = async (userId) => {
    const { data: senders, error } = await db
        .from('sender_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .execute();

    if (error) {
        throw new Error(`Failed to fetch sender addresses: ${error.message}`);
    }

    return senders || [];
};

/**
 * Get default sender for a user
 */
export const getDefaultSender = async (userId) => {
    const { data: sender, error } = await db
        .from('sender_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .eq('is_active', true)
        .single()
        .execute();

    if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" - that's okay
        throw new Error(`Failed to fetch default sender: ${error.message}`);
    }

    return sender || null;
};

/**
 * Get sender by ID
 */
export const getSenderById = async (id, userId) => {
    const { data: sender, error } = await db
        .from('sender_addresses')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()
        .execute();

    if (error) {
        throw new Error(`Failed to fetch sender address: ${error.message}`);
    }

    return sender;
};

/**
 * Create new sender address
 */
export const createSender = async (userId, senderData) => {
    const { email, name, smtpPassword, isDefault = false } = senderData;

    // If this is set as default, unset other defaults first
    if (isDefault) {
        await db
            .from('sender_addresses')
            .update({ is_default: false })
            .eq('user_id', userId)
            .execute();
    }

    const { data: sender, error } = await db
        .from('sender_addresses')
        .insert({
            user_id: userId,
            email,
            name,
            smtp_password: smtpPassword,
            is_default: isDefault,
            is_active: true,
        })
        .select()
        .single()
        .execute();

    if (error) {
        throw new Error(`Failed to create sender address: ${error.message}`);
    }

    return sender;
};

/**
 * Update sender address
 */
export const updateSender = async (id, userId, updates) => {
    const { email, name, smtpPassword, isDefault, isActive } = updates;

    // First check if sender exists and belongs to this user
    const { data: existingSender, error: checkError } = await db
        .from('sender_addresses')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()
        .execute();

    if (checkError || !existingSender) {
        console.error('Sender not found for update:', { id, userId, error: checkError });
        return null;
    }

    // If setting as default, unset other defaults first
    if (isDefault === true) {
        await db
            .from('sender_addresses')
            .update({ is_default: false })
            .eq('user_id', userId)
            .execute();
    }

    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (smtpPassword !== undefined) updateData.smtp_password = smtpPassword;
    if (isDefault !== undefined) updateData.is_default = isDefault;
    if (isActive !== undefined) updateData.is_active = isActive;
    updateData.updated_at = new Date().toISOString();

    console.log('Updating sender:', { id, userId, updateData: { ...updateData, smtp_password: updateData.smtp_password ? '[HIDDEN]' : undefined } });

    const { error } = await db
        .from('sender_addresses')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .execute();

    if (error) {
        console.error('Update sender error:', error);
        throw new Error(`Failed to update sender address: ${error.message}`);
    }

    // Fetch the updated sender
    const { data: updatedSender, error: fetchError } = await db
        .from('sender_addresses')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()
        .execute();

    if (fetchError || !updatedSender) {
        console.error('Failed to fetch updated sender:', fetchError);
        throw new Error('Failed to fetch updated sender');
    }

    console.log('Sender updated successfully:', { id: updatedSender.id, email: updatedSender.email });
    return updatedSender;
};

/**
 * Delete sender address
 */
export const deleteSender = async (id, userId) => {
    const { error } = await db
        .from('sender_addresses')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .execute();

    if (error) {
        throw new Error(`Failed to delete sender address: ${error.message}`);
    }
};

/**
 * Set sender as default (unsets all others)
 */
export const setDefaultSender = async (id, userId) => {
    // First, unset all defaults for this user
    await db
        .from('sender_addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
        .execute();

    // Then set this one as default
    const { data: sender, error } = await db
        .from('sender_addresses')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()
        .execute();

    if (error) {
        throw new Error(`Failed to set default sender: ${error.message}`);
    }

    return sender;
};
