const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

const db = new sqlite3.Database(':memory:');

// Initialize the database with locations, chargers, and GPS data
db.serialize(() => {
    // Create tables
    db.run("CREATE TABLE locations (id INTEGER PRIMARY KEY, name TEXT, address TEXT, latitude REAL, longitude REAL, destination_chargers INTEGER)");
    db.run("CREATE TABLE chargers (id INTEGER PRIMARY KEY, location_id INTEGER, status TEXT, etc TEXT, additional_info TEXT)");

    // Insert data for all 10 locations
    const stmt = db.prepare("INSERT INTO locations (name, address, latitude, longitude, destination_chargers) VALUES (?, ?, ?, ?, ?)");

    // All 10 locations
    stmt.run('Changi City Point', '5 Changi Business Park Central 1, Singapore 486038', 1.334084, 103.961772, 4);
    stmt.run('City Sprouts', '102 Henderson Rd, Singapore 159562', 1.28636, 103.81984, 2);
    stmt.run('Four Points by Sheraton', '382 Havelock Rd, Singapore 169629', 1.28974, 103.83639, 4);
    stmt.run('Great World City', '1 Kim Seng Promenade, Singapore 237994', 1.293692, 103.831860, 3);
    stmt.run('InterContinental Singapore Robertson Quay', '1 Nanson Rd, Singapore 238909', 1.28937, 103.83463, 4);
    stmt.run('Millenia Walk', '9 Raffles Boulevard, Singapore 039596', 1.29341, 103.85823, 4);
    stmt.run('National Sailing Centre', '1500 East Coast Parkway, Singapore 468963', 1.300834, 103.912282, 5);
    stmt.run('One Holland V', '3 Holland Vlg Wy, Singapore 275753', 1.31223, 103.79571, 4);
    stmt.run('Resort World Sentosa (B1 West)', '8 Sentosa Gateway, Singapore 098269', 1.2541, 103.8238, 6);
    stmt.run('VOCO Orchard', '581 Orchard Rd, Singapore 238883', 1.30507, 103.83208, 3);

    stmt.finalize();

    // Insert chargers for all locations
    db.all("SELECT id, destination_chargers FROM locations", (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }

        const chargerStmt = db.prepare("INSERT INTO chargers (location_id, status) VALUES (?, ?)");

        rows.forEach(row => {
            for (let i = 0; i < row.destination_chargers; i++) {
                chargerStmt.run(row.id, 'available');
            }
        });

        chargerStmt.finalize();
    });
});

// API Endpoints
app.get('/api/locations', (req, res) => {
    // Fetch locations in alphabetical order
    db.all("SELECT * FROM locations ORDER BY name ASC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/chargers', (req, res) => {
    db.all("SELECT * FROM chargers", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Update specific fields for a charger
app.patch('/api/chargers/:id', (req, res) => {
    const { status, etc, additional_info } = req.body;
    const id = req.params.id;

    // Build query dynamically to only update the fields that are present in the request
    const updates = [];
    const params = [];
    if (status !== undefined) {
        updates.push("status = ?");
        params.push(status);
    }
    if (etc !== undefined) {
        updates.push("etc = ?");
        params.push(etc);
    }
    if (additional_info !== undefined) {
        updates.push("additional_info = ?");
        params.push(additional_info);
    }
    params.push(id);

    if (updates.length > 0) {
        const query = `UPDATE chargers SET ${updates.join(', ')} WHERE id = ?`;
        db.run(query, params, function(err) {
            if (err) {
                res.status(500).json({ error: err.message }); // Ensure JSON response on error
                return;
            }
            res.json({ updated: true });
        });
    } else {
        res.status(400).json({ error: "No valid fields provided for update" }); // Ensure JSON response on invalid request
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
