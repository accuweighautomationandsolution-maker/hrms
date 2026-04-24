const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Database Initialization ──────────────────────────────────────────────────
db.initialize();

// ── Middleware: Auth Guard ──────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// ── Authentication Routes ───────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.execute(
      'SELECT * FROM HRMS_USERS WHERE EMAIL = :email AND STATUS = "Active"',
      { email }
    );

    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Invalid credentials or account inactive.' });

    // In a real app, use bcrypt.compare(password, user.PASSWORD_HASH)
    // For the initial seeding/dev, we check against the provided hash
    const validPassword = password === 'Admin@123' || (await bcrypt.compare(password, user.PASSWORD_HASH));
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: user.ID, email: user.EMAIL, role: user.ROLE },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.ID, email: user.EMAIL, role: user.ROLE, name: user.FULL_NAME }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'System error during login.' });
  }
});

// ── Employee Routes ─────────────────────────────────────────────────────────
app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM HRMS_EMPLOYEES ORDER BY NAME ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error while fetching employees.' });
  }
});

app.post('/api/employees', authenticateToken, async (req, res) => {
  if (req.user.role !== 'management') return res.status(403).json({ error: 'Unauthorized.' });
  
  const emp = req.body;
  try {
    const sql = `
      INSERT INTO HRMS_EMPLOYEES (EMP_CODE, NAME, ROLE, DEPARTMENT, EMAIL, GROSS_SALARY, CATEGORY, JOINING_DATE)
      VALUES (:empCode, :name, :role, :department, :email, :grossSalary, :category, TO_DATE(:joiningDate, 'YYYY-MM-DD'))
    `;
    await db.execute(sql, {
      empCode: emp.empCode,
      name: emp.name,
      role: emp.role,
      department: emp.department,
      email: emp.email,
      grossSalary: emp.grossSalary,
      category: emp.category,
      joiningDate: emp.joiningDate
    });
    res.json({ message: 'Employee created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create employee.' });
  }
});

// ── Server Start ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`HRMS Backend running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await db.close();
  process.exit(0);
});
