from flask import Flask, render_template, request, jsonify, session, redirect
import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import date


app = Flask(__name__)

app.secret_key = "CHANGE_THIS_INVENTRAX_SECRET_KEY"


# ============================================================
# MYSQL CONFIGURATION
# ============================================================

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "root123",
    "database": "inventrax_final"
}


# ============================================================
# DATABASE
# ============================================================

def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


# ============================================================
# AUTH
# ============================================================

def login_required(function):

    @wraps(function)
    def wrapper(*args, **kwargs):

        if "user_id" not in session:
            return jsonify({
                "success": False,
                "message": "Login required."
            }), 401

        return function(*args, **kwargs)

    return wrapper


def admin_required(function):

    @wraps(function)
    def wrapper(*args, **kwargs):

        # API requests should receive JSON responses.
        # Normal admin pages should redirect to the appropriate page.

        is_api_request = request.path.startswith("/api/")

        # User is not logged in
        if "user_id" not in session:

            if is_api_request:

                return jsonify({
                    "success": False,
                    "message": "Login required."
                }), 401

            return redirect("/login")

        # User is logged in but is not an administrator
        if session.get("role") != "admin":

            if is_api_request:

                return jsonify({
                    "success": False,
                    "message": "Administrator access required."
                }), 403

            return redirect("/stock")

        # Administrator is allowed
        return function(*args, **kwargs)

    return wrapper


# ============================================================
# PAGE ROUTES
# ============================================================

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/login")
def login_page():
    return render_template("login.html")


@app.route("/register")
def register_page():
    return render_template("register.html")


@app.route("/stock")
@login_required
def stock_page():
    return render_template("stock.html")


@app.route("/suppliers")
@login_required
def suppliers_page():
    return render_template("suppliers.html")


@app.route("/purchase-orders")
@login_required
def purchase_orders_page():
    return render_template("purchase_orders.html")


@app.route("/sales")
@login_required
def sales_page():
    return render_template("sales.html")


@app.route("/low-stock")
@login_required
def low_stock_page():
    return render_template("low_stock.html")


@app.route("/reports")
@login_required
def reports_page():
    return render_template("reports.html")


@app.route("/admin/dashboard")
@admin_required
def admin_dashboard_page():
    return render_template("admin_dashboard.html")


@app.route("/admin/users")
@admin_required
def admin_users_page():
    return render_template("admin_users.html")


# ============================================================
# AUTH API
# ============================================================

@app.post("/api/register")
def register():

    data = request.get_json() or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "success": False,
            "message": "Email and password are required."
        }), 400

    if len(password) < 6:
        return jsonify({
            "success": False,
            "message": "Password must contain at least 6 characters."
        }), 400

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (email,)
        )

        if cursor.fetchone():
            return jsonify({
                "success": False,
                "message": "An account with this email already exists."
            }), 409

        password_hash = generate_password_hash(password)

        cursor.execute(
            """
            INSERT INTO users
            (email, password, role, status)
            VALUES (%s, %s, 'user', 'Active')
            """,
            (email, password_hash)
        )

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Registration successful."
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


@app.post("/api/login")
def login():

    data = request.get_json() or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "success": False,
            "message": "Email and password are required."
        }), 400

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT *
            FROM users
            WHERE email = %s
            """,
            (email,)
        )

        user = cursor.fetchone()

        if not user:

            return jsonify({
                "success": False,
                "message": "Account not found."
            }), 404

        if user["status"] != "Active":

            return jsonify({
                "success": False,
                "message": "This account is inactive."
            }), 403

        if not check_password_hash(
            user["password"],
            password
        ):

            return jsonify({
                "success": False,
                "message": "Incorrect email or password."
            }), 401

        cursor.execute(
            """
            UPDATE users
            SET last_login = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (user["id"],)
        )

        connection.commit()

        session.clear()

        session["user_id"] = user["id"]
        session["user_email"] = user["email"]
        session["role"] = user["role"]

        if user["role"] == "admin":

            return jsonify({
                "success": True,
                "redirect": "/admin/dashboard"
            })

        return jsonify({
            "success": True,
            "redirect": "/stock"
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


@app.post("/api/logout")
def logout():

    session.clear()

    return jsonify({
        "success": True,
        "redirect": "/"
    })


@app.get("/api/session")
def current_session():

    return jsonify({
        "logged_in": "user_id" in session,
        "user_id": session.get("user_id"),
        "email": session.get("user_email"),
        "role": session.get("role")
    })


# ============================================================
# STOCK HELPER
# ============================================================

def refresh_low_stock(cursor, connection, user_id, product_id):

    cursor.execute(
        """
        SELECT *
        FROM stock
        WHERE id = %s
        AND user_id = %s
        """,
        (product_id, user_id)
    )

    product = cursor.fetchone()

    if not product:
        return

    if product["quantity"] <= product["minimum_stock"]:

        cursor.execute(
            """
            SELECT id
            FROM low_stock_history
            WHERE product_id = %s
            AND user_id = %s
            AND status = 'Active'
            """,
            (product_id, user_id)
        )

        active = cursor.fetchone()

        if not active:

            cursor.execute(
                """
                INSERT INTO low_stock_history
                (
                    user_id,
                    product_id,
                    product_name,
                    quantity,
                    minimum_stock,
                    status
                )
                VALUES (%s, %s, %s, %s, %s, 'Active')
                """,
                (
                    user_id,
                    product_id,
                    product["product_name"],
                    product["quantity"],
                    product["minimum_stock"]
                )
            )

    else:

        cursor.execute(
            """
            UPDATE low_stock_history
            SET status = 'Resolved',
                resolved_at = CURRENT_TIMESTAMP
            WHERE product_id = %s
            AND user_id = %s
            AND status = 'Active'
            """,
            (product_id, user_id)
        )

    connection.commit()


# ============================================================
# STOCK API
# ============================================================

@app.get("/api/stock")
@login_required
def get_stock():

    search = request.args.get("search", "").strip()
    page = max(int(request.args.get("page", 1)), 1)
    limit = 25
    offset = (page - 1) * limit

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        if search:

            keyword = f"%{search}%"

            cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM stock
                WHERE user_id = %s
                AND (
                    product_name LIKE %s
                    OR category LIKE %s
                )
                """,
                (
                    session["user_id"],
                    keyword,
                    keyword
                )
            )

            total = cursor.fetchone()["total"]

            cursor.execute(
                """
                SELECT *
                FROM stock
                WHERE user_id = %s
                AND (
                    product_name LIKE %s
                    OR category LIKE %s
                )
                ORDER BY id DESC
                LIMIT %s OFFSET %s
                """,
                (
                    session["user_id"],
                    keyword,
                    keyword,
                    limit,
                    offset
                )
            )

        else:

            cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM stock
                WHERE user_id = %s
                """,
                (session["user_id"],)
            )

            total = cursor.fetchone()["total"]

            cursor.execute(
                """
                SELECT *
                FROM stock
                WHERE user_id = %s
                ORDER BY id DESC
                LIMIT %s OFFSET %s
                """,
                (
                    session["user_id"],
                    limit,
                    offset
                )
            )

        products = cursor.fetchall()

        return jsonify({
            "success": True,
            "products": products,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


@app.post("/api/stock")
@login_required
def add_stock():

    data = request.get_json() or {}

    product_name = data.get("product_name", "").strip()
    category = data.get("category", "").strip()

    try:
        quantity = int(data.get("quantity", 0))
        price = float(data.get("price", 0))
        minimum_stock = int(data.get("minimum_stock", 0))
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "message": "Invalid numeric values."
        }), 400

    if not product_name or not category:
        return jsonify({
            "success": False,
            "message": "Product name and category are required."
        }), 400

    if quantity < 0 or price < 0 or minimum_stock < 0:
        return jsonify({
            "success": False,
            "message": "Values cannot be negative."
        }), 400

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id
            FROM stock
            WHERE user_id = %s
            AND LOWER(product_name) = LOWER(%s)
            """,
            (
                session["user_id"],
                product_name
            )
        )

        existing = cursor.fetchone()

        if existing:

            cursor.execute(
                """
                UPDATE stock
                SET category = %s,
                    quantity = %s,
                    price = %s,
                    minimum_stock = %s
                WHERE id = %s
                AND user_id = %s
                """,
                (
                    category,
                    quantity,
                    price,
                    minimum_stock,
                    existing["id"],
                    session["user_id"]
                )
            )

            product_id = existing["id"]

            message = "Product updated successfully."

        else:

            cursor.execute(
                """
                INSERT INTO stock
                (
                    user_id,
                    product_name,
                    category,
                    quantity,
                    price,
                    minimum_stock
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    session["user_id"],
                    product_name,
                    category,
                    quantity,
                    price,
                    minimum_stock
                )
            )

            product_id = cursor.lastrowid

            message = "Product added successfully."

        connection.commit()

        refresh_low_stock(
            cursor,
            connection,
            session["user_id"],
            product_id
        )

        return jsonify({
            "success": True,
            "message": message
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# ============================================================
# SUPPLIER API
# ============================================================

@app.get("/api/suppliers")
@login_required
def get_suppliers():

    search = request.args.get("search", "").strip()
    page = max(int(request.args.get("page", 1)), 1)

    limit = 25
    offset = (page - 1) * limit

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        keyword = f"%{search}%"

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM suppliers
            WHERE user_id = %s
            AND (
                supplier_name LIKE %s
                OR contact_person LIKE %s
                OR email LIKE %s
                OR phone LIKE %s
            )
            """,
            (
                session["user_id"],
                keyword,
                keyword,
                keyword,
                keyword
            )
        )

        total = cursor.fetchone()["total"]

        cursor.execute(
            """
            SELECT *
            FROM suppliers
            WHERE user_id = %s
            AND (
                supplier_name LIKE %s
                OR contact_person LIKE %s
                OR email LIKE %s
                OR phone LIKE %s
            )
            ORDER BY id DESC
            LIMIT %s OFFSET %s
            """,
            (
                session["user_id"],
                keyword,
                keyword,
                keyword,
                keyword,
                limit,
                offset
            )
        )

        return jsonify({
            "success": True,
            "suppliers": cursor.fetchall(),
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


@app.post("/api/suppliers")
@login_required
def add_supplier():

    data = request.get_json() or {}

    supplier_name = data.get("supplier_name", "").strip()
    contact_person = data.get("contact_person", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    address = data.get("address", "").strip()

    if not supplier_name:

        return jsonify({
            "success": False,
            "message": "Supplier name is required."
        }), 400

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO suppliers
            (
                user_id,
                supplier_name,
                contact_person,
                email,
                phone,
                address
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                session["user_id"],
                supplier_name,
                contact_person,
                email,
                phone,
                address
            )
        )

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Supplier added successfully."
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# ============================================================
# PURCHASE ORDER API
# ============================================================

@app.get("/api/purchase-orders")
@login_required
def get_purchase_orders():

    search = request.args.get("search", "").strip()
    page = max(int(request.args.get("page", 1)), 1)

    limit = 25
    offset = (page - 1) * limit
    keyword = f"%{search}%"

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM purchase_orders
            WHERE user_id = %s
            AND (
                supplier_name LIKE %s
                OR product_name LIKE %s
                OR status LIKE %s
            )
            """,
            (
                session["user_id"],
                keyword,
                keyword,
                keyword
            )
        )

        total = cursor.fetchone()["total"]

        cursor.execute(
            """
            SELECT *
            FROM purchase_orders
            WHERE user_id = %s
            AND (
                supplier_name LIKE %s
                OR product_name LIKE %s
                OR status LIKE %s
            )
            ORDER BY order_date DESC
            LIMIT %s OFFSET %s
            """,
            (
                session["user_id"],
                keyword,
                keyword,
                keyword,
                limit,
                offset
            )
        )

        return jsonify({
            "success": True,
            "orders": cursor.fetchall(),
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


@app.post("/api/purchase-orders")
@login_required
def add_purchase_order():

    data = request.get_json() or {}

    supplier_name = data.get("supplier_name", "").strip()
    product_name = data.get("product_name", "").strip()
    status = data.get("status", "Pending")

    try:
        quantity = int(data.get("quantity", 0))
        unit_price = float(data.get("unit_price", 0))
    except (ValueError, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid quantity or price."
        }), 400

    if not supplier_name or not product_name:
        return jsonify({
            "success": False,
            "message": "Supplier and product are required."
        }), 400

    if quantity <= 0 or unit_price < 0:
        return jsonify({
            "success": False,
            "message": "Invalid purchase values."
        }), 400

    total_amount = quantity * unit_price

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            INSERT INTO purchase_orders
            (
                user_id,
                supplier_name,
                product_name,
                quantity,
                unit_price,
                total_amount,
                status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                session["user_id"],
                supplier_name,
                product_name,
                quantity,
                unit_price,
                total_amount,
                status
            )
        )

        if status == "Received":

            cursor.execute(
                """
                SELECT id
                FROM stock
                WHERE user_id = %s
                AND LOWER(product_name) = LOWER(%s)
                """,
                (
                    session["user_id"],
                    product_name
                )
            )

            product = cursor.fetchone()

            if product:

                cursor.execute(
                    """
                    UPDATE stock
                    SET quantity = quantity + %s
                    WHERE id = %s
                    """,
                    (
                        quantity,
                        product["id"]
                    )
                )

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Purchase order recorded successfully."
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# ============================================================
# SALES API
# ============================================================

@app.get("/api/sales")
@login_required
def get_sales():

    search = request.args.get("search", "").strip()
    page = max(int(request.args.get("page", 1)), 1)

    limit = 25
    offset = (page - 1) * limit
    keyword = f"%{search}%"

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM sales
            WHERE user_id = %s
            AND product_name LIKE %s
            """,
            (
                session["user_id"],
                keyword
            )
        )

        total = cursor.fetchone()["total"]

        cursor.execute(
            """
            SELECT *
            FROM sales
            WHERE user_id = %s
            AND product_name LIKE %s
            ORDER BY sale_date DESC
            LIMIT %s OFFSET %s
            """,
            (
                session["user_id"],
                keyword,
                limit,
                offset
            )
        )

        return jsonify({
            "success": True,
            "sales": cursor.fetchall(),
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


@app.post("/api/sales")
@login_required
def add_sale():

    data = request.get_json() or {}

    product_name = data.get("product_name", "").strip()

    try:
        quantity = int(data.get("quantity", 0))
        unit_price = float(data.get("unit_price", 0))
    except (ValueError, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid sales values."
        }), 400

    if quantity <= 0 or unit_price < 0:

        return jsonify({
            "success": False,
            "message": "Invalid quantity or price."
        }), 400

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT *
            FROM stock
            WHERE user_id = %s
            AND LOWER(product_name) = LOWER(%s)
            """,
            (
                session["user_id"],
                product_name
            )
        )

        product = cursor.fetchone()

        if not product:

            return jsonify({
                "success": False,
                "message": "Product not found."
            }), 404

        if product["quantity"] < quantity:

            return jsonify({
                "success": False,
                "message":
                    f"Only {product['quantity']} units are available."
            }), 400

        total_amount = quantity * unit_price

        cursor.execute(
            """
            INSERT INTO sales
            (
                user_id,
                product_name,
                quantity,
                unit_price,
                total_amount
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                session["user_id"],
                product["product_name"],
                quantity,
                unit_price,
                total_amount
            )
        )

        cursor.execute(
            """
            UPDATE stock
            SET quantity = quantity - %s
            WHERE id = %s
            """,
            (
                quantity,
                product["id"]
            )
        )

        connection.commit()

        refresh_low_stock(
            cursor,
            connection,
            session["user_id"],
            product["id"]
        )

        return jsonify({
            "success": True,
            "message": "Sale recorded and stock updated."
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# ============================================================
# LOW STOCK API
# ============================================================

@app.get("/api/low-stock")
@login_required
def get_low_stock():

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT *
            FROM stock
            WHERE user_id = %s
            AND quantity <= minimum_stock
            ORDER BY quantity ASC
            """,
            (session["user_id"],)
        )

        return jsonify({
            "success": True,
            "products": cursor.fetchall()
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# ============================================================
# USER REPORT API
# ============================================================

@app.get("/api/reports")
@login_required
def get_reports():

    today = date.today().isoformat()

    from_date = request.args.get(
        "from_date",
        today
    )

    to_date = request.args.get(
        "to_date",
        today
    )

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                COUNT(*) AS total_sales,
                COALESCE(SUM(quantity), 0) AS units_sold,
                COALESCE(SUM(total_amount), 0) AS revenue
            FROM sales
            WHERE user_id = %s
            AND DATE(sale_date)
            BETWEEN %s AND %s
            """,
            (
                session["user_id"],
                from_date,
                to_date
            )
        )

        sales_summary = cursor.fetchone()

        cursor.execute(
            """
            SELECT
                COUNT(*) AS total_orders,
                COALESCE(SUM(quantity), 0) AS units_ordered,
                COALESCE(SUM(total_amount), 0)
                AS purchase_value
            FROM purchase_orders
            WHERE user_id = %s
            AND DATE(order_date)
            BETWEEN %s AND %s
            """,
            (
                session["user_id"],
                from_date,
                to_date
            )
        )

        purchase_summary = cursor.fetchone()

        cursor.execute(
            """
            SELECT *
            FROM sales
            WHERE user_id = %s
            AND DATE(sale_date)
            BETWEEN %s AND %s
            ORDER BY sale_date DESC
            LIMIT 100
            """,
            (
                session["user_id"],
                from_date,
                to_date
            )
        )

        sales_records = cursor.fetchall()

        cursor.execute(
            """
            SELECT *
            FROM purchase_orders
            WHERE user_id = %s
            AND DATE(order_date)
            BETWEEN %s AND %s
            ORDER BY order_date DESC
            LIMIT 100
            """,
            (
                session["user_id"],
                from_date,
                to_date
            )
        )

        purchase_records = cursor.fetchall()

        cursor.execute(
            """
            SELECT
                COUNT(*) AS total_products,
                COALESCE(
                    SUM(quantity * price),
                    0
                ) AS inventory_value
            FROM stock
            WHERE user_id = %s
            """,
            (session["user_id"],)
        )

        inventory = cursor.fetchone()

        return jsonify({
            "success": True,
            "from_date": from_date,
            "to_date": to_date,
            "sales_summary": sales_summary,
            "purchase_summary": purchase_summary,
            "inventory": inventory,
            "sales_records": sales_records,
            "purchase_records": purchase_records
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# ============================================================
# ADMIN DASHBOARD API
# ============================================================

@app.get("/api/admin/dashboard")
@admin_required
def admin_dashboard_api():

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT COUNT(*) AS total_users
            FROM users
            WHERE role = 'user'
            """
        )

        total_users = cursor.fetchone()["total_users"]

        cursor.execute(
            "SELECT COUNT(*) AS total_products FROM stock"
        )

        total_products = cursor.fetchone()["total_products"]

        cursor.execute(
            """
            SELECT COALESCE(
                SUM(quantity * price), 0
            ) AS inventory_value
            FROM stock
            """
        )

        inventory_value = cursor.fetchone()["inventory_value"]

        cursor.execute(
            """
            SELECT COUNT(*) AS low_stock
            FROM stock
            WHERE quantity <= minimum_stock
            """
        )

        low_stock = cursor.fetchone()["low_stock"]

        cursor.execute(
            """
            SELECT COUNT(*) AS suppliers
            FROM suppliers
            """
        )

        suppliers = cursor.fetchone()["suppliers"]

        cursor.execute(
            """
            SELECT COUNT(*) AS orders
            FROM purchase_orders
            """
        )

        orders = cursor.fetchone()["orders"]

        cursor.execute(
            """
            SELECT
                COUNT(*) AS sales,
                COALESCE(SUM(total_amount), 0)
                AS revenue
            FROM sales
            """
        )

        sales = cursor.fetchone()

        cursor.execute(
            """
            SELECT
                id,
                email,
                role,
                status,
                created_at,
                last_login
            FROM users
            ORDER BY created_at DESC
            LIMIT 8
            """
        )

        recent_users = cursor.fetchall()

        cursor.execute(
            """
            SELECT
                sales.*,
                users.email
            FROM sales
            JOIN users
                ON sales.user_id = users.id
            ORDER BY sale_date DESC
            LIMIT 8
            """
        )

        recent_sales = cursor.fetchall()

        cursor.execute(
            """
            SELECT
                stock.*,
                users.email
            FROM stock
            JOIN users
                ON stock.user_id = users.id
            WHERE stock.quantity <= stock.minimum_stock
            ORDER BY stock.quantity ASC
            LIMIT 8
            """
        )

        low_stock_items = cursor.fetchall()

        return jsonify({
            "success": True,
            "stats": {
                "users": total_users,
                "products": total_products,
                "inventory_value": inventory_value,
                "low_stock": low_stock,
                "suppliers": suppliers,
                "orders": orders,
                "sales": sales["sales"],
                "revenue": sales["revenue"]
            },
            "recent_users": recent_users,
            "recent_sales": recent_sales,
            "low_stock_items": low_stock_items
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# ============================================================
# ADMIN USERS
# ============================================================

@app.get("/api/admin/users")
@admin_required
def admin_users():

    search = request.args.get("search", "").strip()

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        keyword = f"%{search}%"

        cursor.execute(
            """
            SELECT
                u.id,
                u.email,
                u.role,
                u.status,
                u.created_at,
                u.last_login,

                (
                    SELECT COUNT(*)
                    FROM stock s
                    WHERE s.user_id = u.id
                ) AS products,

                (
                    SELECT COUNT(*)
                    FROM suppliers sp
                    WHERE sp.user_id = u.id
                ) AS suppliers,

                (
                    SELECT COUNT(*)
                    FROM purchase_orders po
                    WHERE po.user_id = u.id
                ) AS orders,

                (
                    SELECT COUNT(*)
                    FROM sales sa
                    WHERE sa.user_id = u.id
                ) AS sales

            FROM users u

            WHERE u.email LIKE %s

            ORDER BY u.created_at DESC
            """,
            (keyword,)
        )

        return jsonify({
            "success": True,
            "users": cursor.fetchall()
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# ============================================================
# ADMIN SELECTED USER DETAILS
# ============================================================

@app.get("/api/admin/users/<int:user_id>")
@admin_required
def admin_user_details(user_id):

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                email,
                role,
                status,
                created_at,
                last_login
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        user = cursor.fetchone()

        if not user:

            return jsonify({
                "success": False,
                "message": "User not found."
            }), 404

        cursor.execute(
            """
            SELECT *
            FROM stock
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT 100
            """,
            (user_id,)
        )

        products = cursor.fetchall()

        cursor.execute(
            """
            SELECT *
            FROM suppliers
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT 100
            """,
            (user_id,)
        )

        supplier_list = cursor.fetchall()

        cursor.execute(
            """
            SELECT *
            FROM purchase_orders
            WHERE user_id = %s
            ORDER BY order_date DESC
            LIMIT 100
            """,
            (user_id,)
        )

        orders = cursor.fetchall()

        cursor.execute(
            """
            SELECT *
            FROM sales
            WHERE user_id = %s
            ORDER BY sale_date DESC
            LIMIT 100
            """,
            (user_id,)
        )

        sales_list = cursor.fetchall()

        cursor.execute(
            """
            SELECT *
            FROM stock
            WHERE user_id = %s
            AND quantity <= minimum_stock
            ORDER BY quantity ASC
            """,
            (user_id,)
        )

        low_stock_items = cursor.fetchall()

        return jsonify({
            "success": True,
            "user": user,
            "products": products,
            "suppliers": supplier_list,
            "orders": orders,
            "sales": sales_list,
            "low_stock": low_stock_items
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# ============================================================
# CONTACT
# ============================================================

@app.post("/api/contact")
def contact():

    data = request.get_json() or {}

    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    message = data.get("message", "").strip()

    if not name or not email or not message:

        return jsonify({
            "success": False,
            "message": "Please complete all fields."
        }), 400

    connection = None
    cursor = None

    try:

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO contact_messages
            (name, email, message)
            VALUES (%s, %s, %s)
            """,
            (
                name,
                email,
                message
            )
        )

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Message sent successfully."
        })

    except Error as error:

        return jsonify({
            "success": False,
            "message": str(error)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection and connection.is_connected():
            connection.close()


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )