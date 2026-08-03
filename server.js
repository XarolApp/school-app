const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'School App Backend is running!' });
});

app.get('/test-db', async (req, res) => {
  const { data, error } = await supabase.from('schools').select('*').limit(1);
  if (error) {
    res.json({ status: 'Connected to Supabase, but no schools table yet', error: error.message });
  } else {
    res.json({ status: 'Connected successfully!', data });
  }
});

app.get('/api/schools', async (req, res) => {
  const { data, error } = await supabase.from('schools').select('*');
  if (error) {
    res.status(500).json({ error: error.message });
  } else {
    res.json(data);
  }
});

app.get('/api/schools/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) {
    res.status(404).json({ error: error.message });
  } else {
    res.json(data);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});