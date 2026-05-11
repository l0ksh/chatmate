import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

router.post('/signup', async (req, res) => {
  const { full_name, email, password, role, agreed_to_disclaimer } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!['user', 'listener'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  if (!agreed_to_disclaimer) {
    return res.status(400).json({ error: 'Disclaimer agreement is required' });
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const authUser = authData.user;
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        email,
        full_name,
        role,
        agreed_to_disclaimer,
      })
      .select('id, email, full_name, role, avatar_url, agreed_to_disclaimer, created_at')
      .single();

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    const token = signToken(profile);
    return res.status(201).json({ user: profile, token });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.user) {
      return res.status(401).json({ error: signInError?.message || 'Invalid credentials' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, full_name, role, avatar_url, agreed_to_disclaimer, created_at, is_verified')
      .eq('id', signInData.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (profile.is_verified === false) {
      return res.status(403).json({ error: 'Account is not verified' });
    }

    const token = signToken(profile);
    return res.json({ user: profile, token });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, avatar_url, agreed_to_disclaimer, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: profile });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
