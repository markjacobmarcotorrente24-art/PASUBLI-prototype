# PASUBLI — Web-Based Rental Platform for Apparel in Bicol

A web-based rental platform prototype for apparel, built as a Web Systems final project by students of Bicol University - College of Science, BSIT.

---

## Project Overview

**Original Project Title:** PASUBLI: A Web-Based Rental Platform for Apparel in Bicol University  
**Original Authors:** Banares, Marife Diane B. | Binlayo, Benedick B. | Buban, Lyka F. | Grado, Luis Anthony N.  
**Module Implemented:** Products Listing (CRUD)

This prototype recreates the Products Listing module of the original PASUBLI capstone. It allows a lender to manage their rental inventory — adding, viewing, editing, and deleting clothing listings through a single-page interface.

---

## Group Members

| Name | Contribution |
|---|---|
| Buenconsejo, Vincent A. | Contributed to the overall development and implementation of the project |
| Remendado, Carl Russell M. | Contributed to the overall development and implementation of the project |
| Torrente, Mark Jacob M. | Design of product module UI |
| Zapanta, Johv Triumph F. | Design of product CRUD module |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5 |
| Styling | CSS3 |
| Scripting | Vanilla JavaScript (ES2020) |
| Backend | PHP 8.x |
| Database | MySQL 8.0 |

---

## Requirements

- PHP 8.x
- MySQL 8.0
- A local server environment (XAMPP, Laragon, or WAMP)

---

## Installation

1. **Clone the repository**

```bash
git clone https://github.com/markjacobmarcotorrente24-art/PASUBLI-prototype.git
```

2. **Move the project folder** to your server's web root
   - XAMPP: `C:/xampp/htdocs/PASUBLI-prototype`
   - Laragon: `C:/laragon/www/PASUBLI-prototype`

3. **Create the database**
   - Open phpMyAdmin and create a new database named `pasubli`
   - Import the provided SQL file: `database/pasubli.sql`

4. **Configure the database connection**
   - Open `php/db_config.php` and update if needed:

```php
$host     = 'localhost';
$db_name  = 'pasubli';
$username = 'root';
$password = '';

define('CURRENT_LENDER_ID', 100001);
```

5. **Run the project**
   - Start Apache and MySQL in your local server
   - Visit `http://localhost/PASUBLI-prototype/index.html`

---

## File Structure

```
PASUBLI/
├── index.html          # Single-page UI shell
├── css/
│   └── styles.css      # All styling — layout, glass effect, components
├── js/
│   └── app.js          # All client logic — fetch, CRUD, validation, UI state
└── php/
    ├── db_config.php   # Database credentials and connection factory
    └── products.php    # REST endpoint — handles GET / POST / PUT / DELETE
```

---

## Features

- **Create** — Add a new listing via modal form with client-side and server-side validation
- **Read** — Browse all listings in a table with live stats (total listings, categories, stock)
- **Update** — Edit an existing listing; Product ID is locked after creation
- **Delete** — Remove a listing with a two-step confirmation modal
- **Search** — Debounced search (300ms) filtering by product name and category
- **Category Filter** — Sidebar dropdown for server-side category filtering

---

## Database

The `product` table used by this module:

| Column | Type | Description |
|---|---|---|
| product_id | INT(5) | Primary key, exactly 5 digits |
| lender_id | INT | Foreign key referencing lender |
| product_name | VARCHAR(50) | Name of the listing |
| category | VARCHAR(50) | Clothing category |
| stock_qty | INT | Available stock |
| rental_price | DECIMAL(10,2) | Price per rental |

---

## Notes

- This prototype only implements the **Products Listing module**. Orders, customers, payments, and other modules are not yet implemented.
- Authentication is simulated via a hardcoded `CURRENT_LENDER_ID` constant in `db_config.php`.
- All queries are scoped to the current lender's ID to prevent cross-lender data access.
