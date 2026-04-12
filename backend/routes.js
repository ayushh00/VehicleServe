const express = require('express');
const router = express.Router();
const db = require('./db');

// ==========================================
// ROUTE 1: REGISTER CUSTOMER
// ==========================================
router.post('/register', (req, res) => {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!firstName || !lastName || !email || !phone || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    // Strict 10-digit validation check
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: "Phone number must be exactly 10 digits." });
    }

    // Email validation check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format." });
    }

    const sql = "INSERT INTO customers (firstName, lastName, email, phone, password) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [firstName, lastName, email, phone, password], (err, result) => {
        if (err) {
            // 👉 NEW: Check specifically for Duplicate Email Error
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: "This email address is already registered." });
            }
            
            // If it's a different database error, log it and send a generic message
            console.log("❌ Database Error:", err.message);
            return res.status(500).json({ error: "Registration failed due to a server error." });
        }
        
        res.status(201).json({ message: "Customer registered successfully" });
    });
});

// ==========================================
// ROUTE 2: LOGIN
// ==========================================
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    // Admin check (credentials kept here; move to .env for production)
    if (email === 'admin@vehicle.com' && password === 'admin123') {
        return res.status(200).json({ role: "admin", message: "Admin login successful" });
    }

    const sql = "SELECT * FROM customers WHERE email = ? AND password = ?";
    db.query(sql, [email, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        res.status(200).json({ role: "customer", customer: results[0], message: "Login successful" });
    });
});

// ==========================================
// ROUTE 3: ADD VEHICLE
// ==========================================
router.post('/add-vehicle', (req, res) => {
    const { customerId, registrationNo, make, model, year, vehicleType} = req.body;

    if (!customerId || !registrationNo || !make || !model || !year || !vehicleType) {
        return res.status(400).json({ error: "All vehicle fields are required" });
    }

    const sql = "INSERT INTO vehicles (customerId, registrationNo, make, model, year, vehicleType) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [customerId, registrationNo, make, model, year, vehicleType], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: "Vehicle added successfully" });
    });
});

// ==========================================
// ROUTE 4: GET CUSTOMER VEHICLES
// ==========================================
router.get('/vehicles/:customerId', (req, res) => {
    const sql = "SELECT * FROM vehicles WHERE customerId = ?";
    db.query(sql, [req.params.customerId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// ==========================================
// ROUTE 5: BOOK APPOINTMENT (With Smart Assignment)
// ==========================================
router.post('/book-appointment', (req, res) => {
    const { customerId, vehicleId, serviceType, appointmentDate, appointmentTime, notes } = req.body;

    if (!customerId || !vehicleId || !serviceType || !appointmentDate || !appointmentTime) {
        return res.status(400).json({ error: "All required fields must be filled" });
    }

    const specialtyMap = {
        'Oil Change': 'General Service',
        'Full Service': 'General Service',
        'Engine Check': 'Engine Specialist',
        'Battery Replacement': 'Electrical & AC',
        'AC Service': 'Electrical & AC',
        'Tyre Replacement': 'Suspension & Brakes'
    };

    // Figure out which specialty we need (default to General Service if unknown)
    const requiredSpecialty = specialtyMap[serviceType] || 'General Service';

    // 2. Search the database for ONE active mechanic with that exact specialty
    const findMechanicSql = "SELECT name FROM mechanics WHERE specialty = ? AND status = 'Active' LIMIT 1";
    
    db.query(findMechanicSql, [requiredSpecialty], (err, mechanics) => {
        if (err) {
            console.log("❌ Error finding mechanic:", err.message);
            return res.status(500).json({ error: "Failed to search for available mechanics." });
        }

        // 3. Assign the mechanic (If everyone is on leave, fallback to Unassigned '-')
        const assignedMechanic = mechanics.length > 0 ? mechanics[0].name : '-';

        // 4. Finally, save the appointment with the new mechanic's name!
        const insertSql = "INSERT INTO appointments (customerId, vehicleId, serviceType, appointmentDate, appointmentTime, mechanicName, notes) VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        db.query(insertSql, [customerId, vehicleId, serviceType, appointmentDate, appointmentTime, assignedMechanic, notes || ''], (insertErr, result) => {
            if (insertErr) return res.status(500).json({ error: insertErr.message });
            
            res.status(201).json({ 
                message: "Appointment booked successfully", 
                mechanic: assignedMechanic 
            });
        });
    });
});

// ==========================================
// ROUTE 6: GET ALL APPOINTMENTS (Admin)
// ==========================================
router.get('/appointments', (req, res) => {
    const sql = `
        SELECT a.*, c.firstName, c.lastName, c.phone, v.make, v.model, v.registrationNo 
        FROM appointments a
        JOIN customers c ON a.customerId = c.id
        JOIN vehicles v ON a.vehicleId = v.id
        ORDER BY a.appointmentDate DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// ==========================================
// ROUTE 7: GET CUSTOMER APPOINTMENTS
// FIX: Added LEFT JOIN with invoices to return invoiceId
//      so the customer dashboard can link to the invoice page
// ==========================================
router.get('/appointments/:customerId', (req, res) => {
    const sql = `
        SELECT a.*, v.make, v.model, v.registrationNo, i.id AS invoiceId, i.totalAmount
        FROM appointments a
        JOIN vehicles v ON a.vehicleId = v.id
        LEFT JOIN invoices i ON i.appointmentId = a.id
        WHERE a.customerId = ?
        ORDER BY a.appointmentDate DESC
    `;
    db.query(sql, [req.params.customerId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// ==========================================
// ROUTE 8: UPDATE APPOINTMENT STATUS (With Auto-Invoice)
// ==========================================
router.put('/appointments/:id', (req, res) => {
    const { status } = req.body;
    const appointmentId = req.params.id;

    if (!status) return res.status(400).json({ error: "Status is required" });

    const sql = "UPDATE appointments SET status = ? WHERE id = ?";
    db.query(sql, [status, appointmentId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        // MAGIC TRICK: Auto-generate the invoice bill when marked "Completed"
        if (status === 'Completed') {
            db.query("SELECT customerId FROM appointments WHERE id = ?", [appointmentId], (err, appts) => {
                if (!err && appts.length > 0) {
                    const custId = appts[0].customerId;
                    
                    // Check if an invoice already exists so we don't accidentally make two
                    db.query("SELECT id FROM invoices WHERE appointmentId = ?", [appointmentId], (err, invs) => {
                        if (!err && invs.length === 0) {
                            
                            // Set up the default bill (You can change these numbers!)
                            const labor = 1200.00;
                            const parts = 3500.00;
                            const tax = (labor + parts) * 0.18; // 18% GST calculation
                            const total = labor + parts + tax;

                            const insertSql = "INSERT INTO invoices (customerId, appointmentId, laborCost, partsCost, tax, totalAmount) VALUES (?, ?, ?, ?, ?, ?)";
                            db.query(insertSql, [custId, appointmentId, labor, parts, tax, total]);
                        }
                    });
                }
            });
        }
        res.status(200).json({ message: "Status updated" });
    });
});

// ==========================================
// ROUTE 9: GENERATE INVOICE (Admin)
// ==========================================
router.post('/invoices', (req, res) => {
    const { appointmentId, customerId, laborCost, partsCost, tax } = req.body;

    if (!appointmentId || !customerId) {
        return res.status(400).json({ error: "appointmentId and customerId are required" });
    }

    const totalAmount = (parseFloat(laborCost) || 0) + (parseFloat(partsCost) || 0) + (parseFloat(tax) || 0);
    const sql = "INSERT INTO invoices (appointmentId, customerId, laborCost, partsCost, tax, totalAmount) VALUES (?, ?, ?, ?, ?, ?)";

    db.query(sql, [appointmentId, customerId, laborCost, partsCost, tax, totalAmount], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: "Invoice generated successfully", totalAmount });
    });
});

// ==========================================
// ROUTE 10: GET SINGLE INVOICE BY ID (NEW)
// FIX: Frontend invoice page fetches by invoiceId, not customerId.
//      Full JOIN returns all details the invoice template needs.
// ==========================================
router.get('/invoice/:id', (req, res) => {
    const sql = `
        SELECT 
            i.*,
            a.serviceType, a.appointmentDate, a.notes,
            c.firstName, c.lastName, c.email, c.phone,
            v.make AS vehicleMake, v.model AS vehicleModel,
            v.registrationNo AS vehicleRegNo, v.year AS vehicleYear
        FROM invoices i
        JOIN appointments a ON i.appointmentId = a.id
        JOIN customers c    ON i.customerId    = c.id
        JOIN vehicles v     ON a.vehicleId     = v.id
        WHERE i.id = ?
    `;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: "Invoice not found" });
        res.status(200).json(results[0]);
    });
});

// ==========================================
// ROUTE 11: GET CUSTOMER INVOICES (list)
// ==========================================
router.get('/invoices/:customerId', (req, res) => {
    const sql = `
        SELECT i.*, a.serviceType, a.appointmentDate 
        FROM invoices i
        JOIN appointments a ON i.appointmentId = a.id
        WHERE i.customerId = ?
        ORDER BY i.id DESC
    `;
    db.query(sql, [req.params.customerId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// ==========================================
// ROUTE 12: UPDATE INVOICE DETAILS (Admin)
// ==========================================
router.put('/invoices/:id', (req, res) => {
    const { laborCost, partsCost, paymentStatus, paymentMode } = req.body;

    // Automatically recalculate the math so the Admin doesn't have to!
    const labor = parseFloat(laborCost) || 0;
    const parts = parseFloat(partsCost) || 0;
    const tax = (labor + parts) * 0.18; // 18% GST
    const totalAmount = labor + parts + tax;

    const sql = `
        UPDATE invoices 
        SET laborCost = ?, partsCost = ?, tax = ?, totalAmount = ?, paymentStatus = ?, paymentMode = ? 
        WHERE id = ?
    `;

    db.query(sql, [labor, parts, tax, totalAmount, paymentStatus, paymentMode, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: "Invoice updated successfully" });
    });
});

// ==========================================
// ROUTE 12B: GET ALL INVOICES FOR ADMIN
// ==========================================
router.get('/all-invoices', (req, res) => {
    const sql = `
        SELECT i.*, c.firstName, c.lastName, a.serviceType 
        FROM invoices i
        JOIN customers c ON i.customerId = c.id
        JOIN appointments a ON i.appointmentId = a.id
        ORDER BY i.id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// ==========================================
// ROUTE 13: GET ALL CUSTOMERS (Admin)
// ==========================================
router.get('/customers', (req, res) => {
    // We use a LEFT JOIN and COUNT() to dynamically calculate the vehicleCount
    const sql = `
        SELECT c.*, COUNT(v.id) AS vehicleCount 
        FROM customers c 
        LEFT JOIN vehicles v ON c.id = v.customerId 
        GROUP BY c.id 
        ORDER BY c.id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// ==========================================
// ROUTE 14: GET ALL VEHICLES (Admin)
// ==========================================
router.get('/all-vehicles', (req, res) => {
    const sql = `
        SELECT v.*, c.firstName, c.lastName, c.phone
        FROM vehicles v
        JOIN customers c ON v.customerId = c.id
        ORDER BY v.id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// ==========================================
// ROUTE 15: GET ALL MECHANICS (Admin)
// ==========================================
router.get('/mechanics', (req, res) => {
    const sql = "SELECT * FROM mechanics ORDER BY id ASC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// ==========================================
// ROUTE 16: DELETE CUSTOMER (With Constraint Fix)
// ==========================================
router.delete('/customers/:id', (req, res) => {
    const customerId = req.params.id;

    // To satisfy MySQL constraints, we must delete child records first:
    // 1. Delete their Invoices
    db.query("DELETE FROM invoices WHERE customerId = ?", [customerId], () => {
        // 2. Delete their Appointments
        db.query("DELETE FROM appointments WHERE customerId = ?", [customerId], () => {
            // 3. Delete their Vehicles
            db.query("DELETE FROM vehicles WHERE customerId = ?", [customerId], () => {
                // 4. Finally, delete the Customer
                db.query("DELETE FROM customers WHERE id = ?", [customerId], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.status(200).json({ message: "Customer and all associated data deleted" });
                });
            });
        });
    });
});

// ==========================================
// ROUTE 17: UPDATE MECHANIC STATUS
// ==========================================
router.put('/mechanics/:id/status', (req, res) => {
    db.query("UPDATE mechanics SET status = ? WHERE id = ?", [req.body.status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: "Status updated" });
    });
});

// ==========================================
// ROUTE 18: DELETE MECHANIC
// ==========================================
router.delete('/mechanics/:id', (req, res) => {
    db.query("DELETE FROM mechanics WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: "Mechanic deleted" });
    });
});

// ==========================================
// ROUTE 19: ASSIGN MECHANIC MANUALLY (Admin)
// ==========================================
router.put('/appointments/:id/mechanic', (req, res) => {
    const { mechanicName } = req.body;

    if (!mechanicName) {
        return res.status(400).json({ error: "Mechanic name is required" });
    }

    const sql = "UPDATE appointments SET mechanicName = ? WHERE id = ?";
    db.query(sql, [mechanicName, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: "Mechanic assigned successfully" });
    });
});

module.exports = router;
