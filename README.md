# ⚙ VehicleServe
### Vehicle Service Management Web Application

> A full-stack web application that digitizes and automates the complete workflow of a vehicle service centre — from customer registration and appointment booking to mechanic assignment and invoice generation.

---

## 🌐 Live Preview

> *(Add your deployment link here if hosted)*

---

## 📸 Screenshots

| Home Page | Customer Dashboard |
|-----------|-------------------|
| ![Home](screenshots/home.png) | ![Dashboard](screenshots/dashboard.png) |

| Admin Panel | Invoice |
|-------------|---------|
| ![Admin](screenshots/admin.png) | ![Invoice](screenshots/invoice.png) |

> Add your screenshots inside a `/screenshots` folder in the repo.

---

## 🚀 Features

### 👤 Customer Side
- Register & login with email + password
- Add and manage multiple vehicles
- Book service appointments with preferred date & time
- View appointment history with live status badges
- View and print GST-compliant invoices for completed services

### 🔧 Admin Side
- Dashboard overview — total appointments, pending, completed, customer count
- Approve, complete, or cancel appointments
- **Auto mechanic assignment** — system matches mechanic specialty to service type
- Manually reassign mechanics if needed
- Manage customer records with cascade delete
- View all registered vehicles across all customers
- Toggle mechanic active/leave status
- Edit invoice costs — system auto-recalculates 18% GST and total

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | AngularJS 1.8.2 |
| Styling | Custom CSS3 with CSS Variables (Dark Theme) |
| Backend | Node.js + Express.js v5 |
| Database | MySQL 8.0 |
| DB Driver | mysql (npm) |
| Config | dotenv |
| Dev Tools | XAMPP, VS Code, Postman |

---

## 📁 Project Structure

```
vehicleserve/
├── frontend/
│     ├── index.html          ← Landing page
│     ├── login.html          ← Login & Register
│     ├── customer.html       ← Customer Dashboard
│     ├── appointment.html    ← Book a Service
│     ├── invoice.html        ← Invoice View
│     ├── admin.html          ← Admin Panel (6 tabs)
│     ├── style.css           ← Global dark-theme stylesheet
│     └── app.js              ← All AngularJS controllers + routes
│
└── backend/
      ├── server.js           ← Express server entry point
      ├── routes.js           ← All 19 API route handlers
      ├── db.js               ← MySQL connection pool
      ├── .env                ← DB credentials & port (not committed)
      └── package.json        ← npm dependencies
```

---

## ⚙ Installation & Setup

### Prerequisites
Make sure these are installed on your machine:
- [Node.js v18+](https://nodejs.org/)
- [XAMPP](https://www.apachefriends.org/) (for MySQL)
- [VS Code](https://code.visualstudio.com/) + [Live Server Extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-username/vehicleserve.git
cd vehicleserve
```

---

### Step 2 — Start MySQL

Open **XAMPP Control Panel** → Click **Start** next to **MySQL**

---

### Step 3 — Create the Database

Open **MySQL Workbench** or **phpMyAdmin** (`localhost/phpmyadmin`) and run:

```sql
CREATE DATABASE vehicleservicedb;
USE vehicleservicedb;
```

Then create the 5 tables by running the DDL script:

```sql
-- customers table
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstName VARCHAR(50) NOT NULL,
  lastName VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(15) NOT NULL,
  password VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- vehicles table
CREATE TABLE vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customerId INT NOT NULL,
  registrationNo VARCHAR(20) NOT NULL UNIQUE,
  make VARCHAR(50),
  model VARCHAR(50),
  year INT,
  vehicleType VARCHAR(30),
  color VARCHAR(30),
  FOREIGN KEY (customerId) REFERENCES customers(id)
);

-- mechanics table
CREATE TABLE mechanics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15),
  specialty VARCHAR(100),
  status VARCHAR(20) DEFAULT 'Active'
);

-- appointments table
CREATE TABLE appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customerId INT NOT NULL,
  vehicleId INT NOT NULL,
  serviceType VARCHAR(100),
  appointmentDate DATE NOT NULL,
  appointmentTime TIME NOT NULL,
  mechanicName VARCHAR(100),
  status VARCHAR(20) DEFAULT 'Pending',
  notes TEXT,
  FOREIGN KEY (customerId) REFERENCES customers(id),
  FOREIGN KEY (vehicleId) REFERENCES vehicles(id)
);

-- invoices table
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointmentId INT NOT NULL,
  customerId INT NOT NULL,
  laborCost DECIMAL(10,2),
  partsCost DECIMAL(10,2),
  tax DECIMAL(10,2),
  totalAmount DECIMAL(10,2),
  paymentStatus VARCHAR(20) DEFAULT 'Unpaid',
  paymentMode VARCHAR(30),
  FOREIGN KEY (appointmentId) REFERENCES appointments(id),
  FOREIGN KEY (customerId) REFERENCES customers(id)
);
```

---

### Step 4 — Fix MySQL Auth Mode ⚠️

> MySQL 8.0 uses a new auth plugin that the `mysql` npm package doesn't support. Run this fix once:

```sql
ALTER USER 'root'@'localhost' 
IDENTIFIED WITH mysql_native_password BY '';
FLUSH PRIVILEGES;
```

---

### Step 5 — Seed Sample Mechanics

```sql
INSERT INTO mechanics (name, phone, specialty, status) VALUES
('Suresh Kumar',  '9811122233', 'General Service',     'Active'),
('Ramesh Yadav',  '9822233344', 'Suspension & Brakes', 'Active'),
('Vijay Patil',   '9833344455', 'Electrical & AC',     'Active'),
('Ganesh More',   '9844455566', 'Engine Specialist',   'Active');
```

---

### Step 6 — Configure Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=vehicleservicedb
DB_PORT=3306
PORT=3000
```

---

### Step 7 — Install Backend Dependencies & Start Server

```bash
cd backend
npm install
node server.js
```

You should see:
```
✅ MySQL Pool Connected Successfully to vehicleservicedb
🚀 Server is running on port 3000
```

---

### Step 8 — Run the Frontend

- Open the `frontend` folder in VS Code
- Right-click on `index.html`
- Select **"Open with Live Server"**
- Browser opens at `http://localhost:5500`

---

## 🔑 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@vehicle.com | admin123 |
| Customer | Register first via the Register tab | your chosen password |

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register new customer |
| POST | `/api/login` | Login — returns role + customer data |
| POST | `/api/add-vehicle` | Add vehicle for a customer |
| GET | `/api/vehicles/:customerId` | Get customer's vehicles |
| POST | `/api/book-appointment` | Book service + auto-assign mechanic |
| GET | `/api/appointments` | Get all appointments (admin) |
| GET | `/api/appointments/:customerId` | Get customer's appointments |
| PUT | `/api/appointments/:id` | Update status + auto-generate invoice |
| PUT | `/api/appointments/:id/mechanic` | Manually assign mechanic |
| GET | `/api/invoice/:id` | Get single invoice by ID |
| GET | `/api/invoices/:customerId` | Get all customer invoices |
| PUT | `/api/invoices/:id` | Update invoice costs |
| GET | `/api/all-invoices` | Get all invoices (admin) |
| GET | `/api/customers` | Get all customers with vehicle count |
| DELETE | `/api/customers/:id` | Delete customer + all related data |
| GET | `/api/all-vehicles` | Get all vehicles (admin) |
| GET | `/api/mechanics` | Get all mechanics |
| PUT | `/api/mechanics/:id/status` | Toggle mechanic status |
| DELETE | `/api/mechanics/:id` | Remove mechanic |

---

## 🧠 How Auto Mechanic Assignment Works

When a customer books a service, the system automatically finds an **Active** mechanic with the matching specialty:

| Service Type | Required Specialty |
|-------------|-------------------|
| Oil Change, Full Service | General Service |
| Engine Check | Engine Specialist |
| Battery Replacement, AC Service | Electrical & AC |
| Tyre Replacement | Suspension & Brakes |

If no mechanic is available (all on leave), the appointment is saved as `Unassigned` and the admin can assign manually.

---

## 🧾 Auto Invoice Generation

When an admin marks a service as **Completed**, an invoice is automatically created with:

| Item | Default Value |
|------|--------------|
| Labour Cost | ₹1,200.00 |
| Parts Cost | ₹3,500.00 |
| GST (18%) | ₹846.00 |
| **Total** | **₹5,546.00** |

The admin can edit all values from the Invoices tab — GST and total are recalculated server-side automatically.

---

## ⚠️ Known Limitations

- Passwords are stored in **plain text** — bcrypt hashing should be added before production
- Authentication uses **sessionStorage** — no JWT tokens
- Admin credentials are **hardcoded** in routes.js
- No email/SMS notifications for booking confirmations

---

## 🔮 Future Enhancements

- [ ] Password hashing with bcrypt
- [ ] JWT-based authentication
- [ ] Email/SMS notifications for booking & status updates
- [ ] Online payment gateway (Razorpay / Stripe)
- [ ] Mechanic availability calendar
- [ ] Pagination and export (PDF/Excel) for admin tables
- [ ] Mobile app using the existing REST API
- [ ] Multi-branch service centre support

---

## 👨‍💻 Team

| Name | Roll No. | Contribution |
|------|----------|-------------|
| Team Member 1 | Roll No. 1 | Full-stack development, API, database design, UI/UX |
| Team Member 2 | Roll No. 2 | Frontend pages, CSS styling, testing |
| Team Member 3 | Roll No. 3 | Backend routes, API integration |
| Team Member 4 | Roll No. 4 | Database schema, report writing, QA |

---

## 📄 License

This project is built for academic purposes at **Sandip University, Nashik**  
Department of Computer Science & Engineering — Academic Year 2024–25

---

<div align="center">
  Made with ❤️ by the VehicleServe Team · Sandip University, Nashik
</div>
