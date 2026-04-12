/* ============================================================
   VehicleServe — AngularJS App 
   Backend Base URL: http://localhost:3000
   ============================================================ */

const BASE_URL = 'http://localhost:3000';

angular.module('VehicleApp', ['ngRoute'])

/* ── Route Config ── */
.config(function($routeProvider, $locationProvider) {
  $locationProvider.hashPrefix('');
  $routeProvider
    .when('/',            { templateUrl: 'index.html' })
    .when('/login',       { templateUrl: 'login.html' })
    .when('/customer',    { templateUrl: 'customer.html',    controller: 'CustomerController' })
    .when('/appointment', { templateUrl: 'appointment.html', controller: 'AppointmentController' })
    .when('/admin',       { templateUrl: 'admin.html',       controller: 'AdminController' })
    .when('/invoice',     { templateUrl: 'invoice.html',     controller: 'InvoiceController' })
    .otherwise({ redirectTo: '/' });
})

/* ══════════════════════════════════════
   LOGIN CONTROLLER
══════════════════════════════════════ */
.controller('LoginController', function($scope, $http, $window) {
  const urlParams = new URLSearchParams($window.location.search);
  const tabParam = urlParams.get('tab');
  
  // Set activeTab based on ?tab=register, otherwise default to 'login'
  $scope.activeTab = (tabParam === 'register') ? 'register' : 'login';

  $scope.loginData    = { email: '', password: '' };
  $scope.registerData = { firstName: '', lastName: '', email: '', phone: '', password: '' };

  $scope.loginError      = '';
  $scope.registerError   = '';
  $scope.registerSuccess = '';

  $scope.setTab = function(tab) {
    $scope.activeTab       = tab;
    $scope.loginError      = '';
    $scope.registerError   = '';
    $scope.registerSuccess = '';
  };

  $scope.login = function() {
    $scope.loginError = '';
    $http.post(BASE_URL + '/api/login', $scope.loginData)
      .then(function(res) {
        if (res.data.role === 'admin') {
          // FIX: clear any leftover customer session before admin login
          $window.sessionStorage.removeItem('customerId');
          $window.sessionStorage.removeItem('customerName');
          $window.location.href = 'admin.html';
        } else {
          // FIX: save customer info to localStorage so all pages can use it
          $window.sessionStorage.setItem('customerId',   res.data.customer.id);
          $window.sessionStorage.setItem('customerName', res.data.customer.firstName);
          $window.location.href = 'customer.html';
        }
      })
      .catch(function(err) {
          $scope.loginError = (err.data && err.data.error) ? err.data.error : 'Login failed. Please check your credentials.';
      });
  };

  $scope.register = function() {
    $scope.registerError   = '';
    $scope.registerSuccess = '';
    $http.post(BASE_URL + '/api/register', $scope.registerData)
      .then(function() {
        $scope.registerSuccess = 'Account created! You can now log in.';
        $scope.registerData = { firstName:'', lastName:'', email:'', phone:'', password:'' };
      })
      .catch(function(err) {
        $scope.registerError = (err.data && err.data.error) ? err.data.error : 'Registration failed. Try again.';
      });
  };
})

/* ══════════════════════════════════════
   CUSTOMER CONTROLLER
══════════════════════════════════════ */
.controller('CustomerController', function($scope, $http, $window) {
  // FIX: read customerId saved during login
  const customerId = $window.sessionStorage.getItem('customerId');

  // Guard: if not logged in, redirect to login
  if (!customerId) {
    $window.location.href = 'login.html';
    return;
  }

  $scope.customerName = $window.sessionStorage.getItem('customerName') || 'Customer';
  $scope.vehicles     = [];
  $scope.appointments = [];
  $scope.showModal    = false;
  $scope.addVehicleError = '';

  $scope.newVehicle = { regNo:'', make:'', model:'', year:'', vehicleType:'' };
  $scope.stats = { vehicles:0, appointments:0, pending:0, totalSpent:0 };

  function loadVehicles() {
    // FIX: include customerId in the URL (was /api/vehicles with no ID)
    $http.get(BASE_URL + '/api/vehicles/' + customerId)
      .then(function(res) {
        $scope.vehicles = res.data;
        $scope.stats.vehicles = res.data.length;
      })
      .catch(function() { $scope.vehicles = []; });
  }

  function loadAppointments() {
    // FIX: correct endpoint (was /api/appointments/my which doesn't exist)
    $http.get(BASE_URL + '/api/appointments/' + customerId)
      .then(function(res) {
        $scope.appointments = res.data;
        $scope.stats.appointments = res.data.length;
        $scope.stats.pending   = res.data.filter(a => a.status === 'Pending').length;
        $scope.stats.totalSpent = res.data
          .filter(a => a.status === 'Completed')
          .reduce((s, a) => s + (a.totalAmount || 0), 0);
      })
      .catch(function() { $scope.appointments = []; });
  }

  loadVehicles();
  loadAppointments();

  $scope.openModal  = function() { $scope.showModal = true; };
  $scope.closeModal = function() { $scope.showModal = false; $scope.addVehicleError = ''; };

  $scope.addVehicle = function() {
    $scope.addVehicleError = '';

    // Convert registration number to uppercase
    const regNoUpper = ($scope.newVehicle.regNo || '').toUpperCase();

    // FIX: map regNo → registrationNo AND include customerId (both were missing)
    $http.post(BASE_URL + '/api/add-vehicle', {
      customerId:     customerId,
      registrationNo: regNoUpper,
      make:           $scope.newVehicle.make,
      model:          $scope.newVehicle.model,
      year:           $scope.newVehicle.year,
      vehicleType:    $scope.newVehicle.vehicleType,
      color:          $scope.newVehicle.color || ''
    })
    .then(function() {
      $scope.closeModal();
      $scope.newVehicle = { regNo:'', make:'', model:'', year:'', vehicleType:'' };
      loadVehicles();
    })
    .catch(function(err) {
      $scope.addVehicleError = (err.data && err.data.error) ? err.data.error : 'Failed to add vehicle.';
    });
  };

  $scope.logout = function() {
    $window.sessionStorage.removeItem('customerId');
    $window.sessionStorage.removeItem('customerName');
    $window.location.href = 'login.html';
  };

  $scope.statusClass = function(s) {
    const m = { Completed:'badge badge-completed', Pending:'badge badge-pending', Cancelled:'badge badge-cancelled', Approved:'badge badge-approved' };
    return m[s] || 'badge badge-pending';
  };
})

/* ══════════════════════════════════════
   APPOINTMENT CONTROLLER
══════════════════════════════════════ */
.controller('AppointmentController', function($scope, $http, $window, $filter) {
  // FIX: read customerId saved during login
  const customerId = $window.sessionStorage.getItem('customerId');

  if (!customerId) {
    $window.location.href = 'login.html';
    return;
  }

  $scope.vehicles     = [];
  $scope.bookingDone  = false;
  $scope.bookingError = '';

  $scope.appointment  = { vehicleId:'', serviceType:'', date:'', time:'', notes:'' };
  $scope.serviceTypes = ['Oil Change','Tyre Replacement','Engine Check','Battery Replacement','Full Service'];

  // FIX: include customerId in URL (was /api/vehicles with no ID)
  $http.get(BASE_URL + '/api/vehicles/' + customerId)
    .then(function(res) { $scope.vehicles = res.data; })
    .catch(function() { $scope.vehicles = []; });

  $scope.confirmBooking = function() {
    $scope.bookingError = '';
    
    // THE FIX: Strip away all timezone data and force a clean "YYYY-MM-DD" string
    let cleanDate = $scope.appointment.date;
    if (cleanDate instanceof Date) {
        cleanDate = $filter('date')(cleanDate, 'yyyy-MM-dd');
    }

    $http.post(BASE_URL + '/api/book-appointment', {
      customerId:      customerId,
      vehicleId:       $scope.appointment.vehicleId,
      serviceType:     $scope.appointment.serviceType,
      appointmentDate: cleanDate, // Send the clean string!
      appointmentTime: $scope.appointment.time,
      notes:           $scope.appointment.notes
    })
    .then(function() {
      $scope.bookingDone = true;
      $scope.appointment = { vehicleId:'', serviceType:'', date:'', time:'', notes:'' };
    })
    .catch(function(err) {
      $scope.bookingError = (err.data && err.data.error) ? err.data.error : 'Booking failed. Please try again.';
    });
  };

  $scope.bookAnother = function() { $scope.bookingDone = false; };
})

/* ══════════════════════════════════════
   ADMIN CONTROLLER
══════════════════════════════════════ */
.controller('AdminController', function($scope, $http) {
  $scope.activeTab    = 'dashboard';
  $scope.appointments = [];
  $scope.customers    = [];
  $scope.allVehicles = [];
  $scope.mechanics = [];
  $scope.searchQuery  = '';
  $scope.stats = { totalAppointments:0, pending:0, completed:0, customers:0 };

  function loadAppointments() {
    $http.get(BASE_URL + '/api/appointments')
      .then(function(res) {
        $scope.appointments = res.data;
        $scope.stats.totalAppointments = res.data.length;
        $scope.stats.pending   = res.data.filter(a => a.status === 'Pending').length;
        $scope.stats.completed = res.data.filter(a => a.status === 'Completed').length;
      })
      .catch(function() { $scope.appointments = []; });
  }

  function loadCustomers() {
    // FIX: this route now exists in the updated routes.js
    $http.get(BASE_URL + '/api/customers')
      .then(function(res) {
        $scope.customers = res.data;
        $scope.allVehicles = [];
        $scope.stats.customers = res.data.length;
      })
      .catch(function() { $scope.customers = []; });
  }

  function loadAllVehicles() {
  $http.get(BASE_URL + '/api/all-vehicles')
    .then(function(res) {
      $scope.allVehicles = res.data;
    })
    .catch(function() { $scope.allVehicles = []; });
}

function loadMechanics() {
  $http.get(BASE_URL + '/api/mechanics')
    .then(function(res) {
      $scope.mechanics = res.data;
    })
    .catch(function() { $scope.mechanics = []; });
}

// Manually Assign a Mechanic from the Dashboard
  $scope.assignMechanic = function(appt) {
    if (!appt.newMechanic) return;
    
    $http.put(BASE_URL + '/api/appointments/' + appt.id + '/mechanic', { mechanicName: appt.newMechanic })
      .then(function() {
        // Update the UI instantly without needing a refresh!
        appt.mechanicName = appt.newMechanic; 
      })
      .catch(function(err) {
        alert("Failed to assign mechanic.");
      });
  };

  // Load Invoices for the Admin
  $scope.allInvoices = [];
  function loadAllInvoices() {
    $http.get(BASE_URL + '/api/all-invoices')
      .then(function(res) { $scope.allInvoices = res.data; })
      .catch(function() { $scope.allInvoices = []; });
  }
  loadAllInvoices(); // Call it when the page loads

  // Function to save edited invoice
  $scope.saveInvoice = function(inv) {
    $http.put(BASE_URL + '/api/invoices/' + inv.id, {
      laborCost: inv.laborCost,
      partsCost: inv.partsCost,
      paymentStatus: inv.paymentStatus,
      paymentMode: inv.paymentMode
    }).then(function() {
      alert("Invoice updated successfully!");
      loadAllInvoices(); // Refresh the table to show the new math
    }).catch(function() {
      alert("Failed to update invoice.");
    });
  };

// Delete Customer
  $scope.deleteCustomer = function(id) {
    if (confirm("Are you sure you want to delete this customer?")) {
      $http.delete(BASE_URL + '/api/customers/' + id).then(function() {
        loadCustomers(); // Reload the table instantly
      });
    }
  };

  // Toggle Mechanic Status
  $scope.toggleMechanicStatus = function(m) {
    const newStatus = m.status === 'Active' ? 'On Leave' : 'Active';
    $http.put(BASE_URL + '/api/mechanics/' + m.id + '/status', { status: newStatus }).then(function() {
      m.status = newStatus; // Update UI instantly
    });
  };

  // Delete Mechanic
  $scope.deleteMechanic = function(id) {
    if (confirm("Are you sure you want to remove this mechanic?")) {
      $http.delete(BASE_URL + '/api/mechanics/' + id).then(function() {
        loadMechanics(); // Reload the table instantly
      });
    }
  };
  
  loadAppointments();
  loadCustomers();
  loadAllVehicles();
  loadMechanics();

  $scope.setTab = function(tab) { $scope.activeTab = tab; };

  $scope.updateStatus = function(appt, newStatus) {
    // FIX: removed extra /status from URL (was /api/appointments/:id/status)
    $http.put(BASE_URL + '/api/appointments/' + appt.id, { status: newStatus })
      .then(function() {
        appt.status = newStatus;
        $scope.stats.pending   = $scope.appointments.filter(a => a.status === 'Pending').length;
        $scope.stats.completed = $scope.appointments.filter(a => a.status === 'Completed').length;
      })
      .catch(function(err) { alert('Update failed: ' + ((err.data && err.data.error) ? err.data.error : 'Error')); });
  };

  $scope.filteredCustomers = function() {
    if (!$scope.searchQuery) return $scope.customers;
    const q = $scope.searchQuery.toLowerCase();
    return $scope.customers.filter(c =>
      (c.firstName && (c.firstName + ' ' + c.lastName).toLowerCase().includes(q)) ||
      (c.email     && c.email.toLowerCase().includes(q)) ||
      (c.phone     && c.phone.toLowerCase().includes(q))
    );
  };

  $scope.statusClass = function(s) {
    const m = { Completed:'badge badge-completed', Pending:'badge badge-pending', Cancelled:'badge badge-cancelled', Approved:'badge badge-approved' };
    return m[s] || 'badge badge-pending';
  };
})

/* ══════════════════════════════════════
   INVOICE CONTROLLER
══════════════════════════════════════ */
.controller('InvoiceController', function($scope, $http, $location) {
  $scope.invoice = null;
  $scope.loading = true;
  $scope.error   = '';

  const urlParams = new URLSearchParams(window.location.search);
  const invoiceId = urlParams.get('id');

  if (!invoiceId) {
    // No ?id= param — show the demo/placeholder card (no API call needed)
    $scope.loading = false;
  } else {
    // FIX: use the new single-invoice-by-ID route (was /api/invoices/:customerId which is a list)
    $http.get(BASE_URL + '/api/invoice/' + invoiceId)
      .then(function(res) {
        $scope.invoice = res.data;
        // FIX: laborCost (DB) aliased to labourCost so the HTML template works unchanged
        $scope.invoice.labourCost = $scope.invoice.laborCost || 0;
        $scope.invoice.subtotal   = $scope.invoice.labourCost + ($scope.invoice.partsCost || 0);
        // FIX: use the tax already stored in DB instead of recomputing at 18%
        $scope.invoice.gst        = $scope.invoice.tax || 0;
        $scope.invoice.total      = $scope.invoice.totalAmount || ($scope.invoice.subtotal + $scope.invoice.gst);
        // Map joined fields to what the template expects
        $scope.invoice.customerName  = $scope.invoice.firstName + ' ' + $scope.invoice.lastName;
        $scope.invoice.customerEmail = $scope.invoice.email;
        $scope.invoice.customerPhone = $scope.invoice.phone;
        $scope.invoice.invoiceNo     = 'INV-' + String($scope.invoice.id).padStart(4, '0');
        $scope.invoice.date          = $scope.invoice.appointmentDate;
        $scope.loading = false;
      })
      .catch(function() {
        $scope.error   = 'Invoice not found.';
        $scope.loading = false;
      });
  }

  $scope.printInvoice = function() { window.print(); };

  $scope.paymentClass = function(s) {
    const m = { Paid:'badge badge-completed', Unpaid:'badge badge-pending', Partial:'badge badge-approved' };
    return m[s] || 'badge badge-pending';
  };
});
