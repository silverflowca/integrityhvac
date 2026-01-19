# Admin Accounts

## Default Admin Accounts

The system comes with four pre-configured admin accounts for testing and initial setup:

### System Administrator (Primary)
- **Email**: `admin@integrityhvac.com`
- **Password**: `Admin123!`
- **Name**: System Administrator
- **Role**: admin

### Additional Admin Accounts

#### Admin User 1
- **Email**: `admin1@integrityhvac.com`
- **Password**: `Admin123!`
- **Name**: Admin User 1
- **Role**: admin

#### Admin User 2
- **Email**: `admin2@integrityhvac.com`
- **Password**: `Admin123!`
- **Name**: Admin User 2
- **Role**: admin

#### Admin User 3
- **Email**: `admin3@integrityhvac.com`
- **Password**: `Admin123!`
- **Name**: Admin User 3
- **Role**: admin

---

## Creating Admin Accounts

### Using the Script

Run the following command to create/update the default admin accounts:

```bash
cd integrityhvac/server
node scripts/create-admin-users.js
```

### Manual Creation via User Management UI

1. Log in with an existing admin account
2. Navigate to **User Management** in the sidebar (admin only)
3. Click **Add User**
4. Fill in the user details:
   - Email
   - Name
   - Role (select "admin")
   - Password (minimum 6 characters)
5. Click **Create User**

---

## Environment Variables

The default admin credentials are stored in the `.env` file:

```env
# Default System Admin Account
DEFAULT_ADMIN_EMAIL=admin@integrityhvac.com
DEFAULT_ADMIN_PASSWORD=Admin123!
DEFAULT_ADMIN_NAME=System Administrator
```

---

## Security Notes

⚠️ **IMPORTANT**: Change the default password immediately after first login in production environments!

- All admin accounts have full access to the system
- Admin users can:
  - Create, edit, and delete other users
  - Manage roles and permissions
  - Access all leads and campaigns
  - View system-wide analytics
  - Modify system settings

---

## Password Requirements

- Minimum 6 characters
- Passwords are hashed using bcrypt (salt rounds: 10)
- Password hashes are stored in the `users.password_hash` column

---

## Login

To log in with an admin account:

1. Navigate to the login page
2. Enter the email and password
3. Click **Login**
4. You will be redirected to the dashboard with admin privileges

The User Management section will only be visible in the sidebar if you are logged in as an admin user.
