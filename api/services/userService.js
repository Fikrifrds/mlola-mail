import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';
import { generateToken } from '../config/jwt.js';

export const createUser = async (userData) => {
  const { email, password, name } = userData;

  // Check if user already exists
  const { data: existingUser } = await db
    .from('users')
    .select('id')
    .eq('email', email)
    .single()
    .execute();

  if (existingUser) {
    throw new Error('User already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const { data: user, error } = await db
    .from('users')
    .insert([{
      email,
      password_hash: passwordHash,
      name,
      role: 'developer'
    }])
    .select()
    .single()
    .execute();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  return { user, token };
};

export const authenticateUser = async (email, password) => {
  // Find user by email
  const { data: user, error } = await db
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
    .execute();

  if (error || !user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  return { user, token };
};

export const getUserById = async (userId) => {
  const { data: user, error } = await db
    .from('users')
    .select('id, email, name, role, email_config, created_at, updated_at')
    .eq('id', userId)
    .single()
    .execute();

  if (error) {
    return null;
  }

  return user;
};

export const updateUserEmailConfig = async (userId, emailConfig) => {
  const { data: user, error } = await db
    .from('users')
    .update({ email_config: emailConfig, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
    .execute();

  if (error) {
    throw new Error(`Failed to update email config: ${error.message}`);
  }

  return user;
};