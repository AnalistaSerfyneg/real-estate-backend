const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'real_estate'
});

db.connect(err => {
  if (err) {
    console.error('Error conectando a MySQL:', err);
    return;
  }
  console.log('Conectado a MySQL');
});

// Endpoint para obtener propiedades
app.get('/api/properties', (req, res) => {
  const { search, type, minPrice, maxPrice, bedrooms, bathrooms, yearBuilt } = req.query;
  let query = `
    SELECT p.*, a.name AS agent_name, a.image AS agent_image,
           GROUP_CONCAT(f.feature) AS features,
           GROUP_CONCAT(i.image_url) AS images
    FROM properties p
    LEFT JOIN agents a ON p.agent_id = a.id
    LEFT JOIN features f ON p.id = f.property_id
    LEFT JOIN images i ON p.id = i.property_id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND (p.city LIKE ? OR p.address LIKE ? OR p.description LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (type) {
    query += ` AND p.propertyType = ?`;
    params.push(type);
  }
  if (minPrice) {
    query += ` AND p.price >= ?`;
    params.push(minPrice);
  }
  if (maxPrice) {
    query += ` AND p.price <= ?`;
    params.push(maxPrice);
  }
  if (bedrooms) {
    query += ` AND p.bedrooms >= ?`;
    params.push(bedrooms);
  }
  if (bathrooms) {
    query += ` AND p.bathrooms >= ?`;
    params.push(bathrooms);
  }
  if (yearBuilt) {
    query += ` AND p.yearBuilt >= ?`;
    params.push(yearBuilt);
  }

  query += ` GROUP BY p.id`;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error ejecutando consulta:', err);
      res.status(500).json({ error: 'Error en el servidor' });
      return;
    }
    const properties = results.map(row => ({
      ...row,
      features: row.features ? row.features.split(',') : [],
      images: row.images ? row.images.split(',') : [],
      agent: {
        id: row.agent_id,
        name: row.agent_name,
        image: row.agent_image
      }
    }));
    res.json(properties);
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));